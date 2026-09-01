package websocket

import (
	"chat-app/internal/dto"
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 1024 * 1024 // 1MB
)

type Hub struct {
	Clients    map[string]*Client
	Broadcast  chan []byte
	Register   chan *Client
	Unregister chan *Client
	mu         sync.RWMutex
	DB         *gorm.DB
	Redis      *redis.Client
}

type Client struct {
	Hub    *Hub
	Conn   *websocket.Conn
	Send   chan []byte
	UserID string
}

func NewHub(db *gorm.DB, rdb *redis.Client) *Hub {
	return &Hub{
		Clients:    make(map[string]*Client),
		Broadcast:  make(chan []byte, 256),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		DB:         db,
		Redis:      rdb,
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			if existing, ok := h.Clients[client.UserID]; ok {
				existing.Conn.Close()
			}
			h.Clients[client.UserID] = client
			h.mu.Unlock()

			h.Redis.Set(context.Background(), "user:"+client.UserID+":online", 1, 5*time.Minute)
			h.DB.Exec("UPDATE users SET is_online = true WHERE id = ?", client.UserID)

			go h.maintainOnlineStatus(client.UserID)
			h.broadcastStatus(client.UserID, "online")

		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.Clients[client.UserID]; ok {
				delete(h.Clients, client.UserID)
				close(client.Send)
			}
			h.mu.Unlock()

			h.Redis.Del(context.Background(), "user:"+client.UserID+":online")
			h.DB.Exec("UPDATE users SET is_online = false WHERE id = ?", client.UserID)
			h.broadcastStatus(client.UserID, "offline")

		case message := <-h.Broadcast:
			h.handleBroadcast(message)
		}
	}
}

func (h *Hub) handleBroadcast(message []byte) {
	var msg map[string]interface{}
	if err := json.Unmarshal(message, &msg); err != nil {
		log.Println("Invalid broadcast message:", err)
		return
	}

	msgType, _ := msg["type"].(string)
	convID, _ := msg["conversation_id"].(string)

	switch msgType {
	case "message":
		var wsMsg dto.WSMessageType
		if err := json.Unmarshal(message, &wsMsg); err != nil {
			log.Println("Invalid chat message:", err)
			return
		}
		if wsMsg.MessageType == "" {
			wsMsg.MessageType = "text"
		}
		h.handleChatMessage(wsMsg)

	case "typing":
		senderID, _ := msg["sender_id"].(string)
		h.BroadcastToConversation(convID, senderID, map[string]interface{}{
			"type":            "typing",
			"conversation_id": convID,
			"user_id":         senderID,
		})
	}
}

func (h *Hub) handleChatMessage(msg dto.WSMessageType) {
	senderID := msg.SenderID
	content := msg.Content
	msgContentType := msg.MessageType
	convID := msg.ConversationID
	if msgContentType == "" {
		msgContentType = "text"
	}
	fileURL := msg.FileURL

	// Save to DB
	var msgID string
	var createdAt time.Time
	err := h.DB.Raw(`
		INSERT INTO messages (conversation_id, sender_id, type, content, file_url)
		VALUES (?, ?, ?, ?, ?) RETURNING id, created_at
	`, convID, senderID, msgContentType, content, fileURL).Row().Scan(&msgID, &createdAt)
	if err != nil {
		log.Println("Failed to save message:", err)
		return
	}

	// Fetch sender info
	type SenderInfo struct {
		ID        string `gorm:"column:id"`
		Name      string `gorm:"column:name"`
		AvatarURL string `gorm:"column:avatar_url"`
	}
	var sender SenderInfo
	h.DB.Raw("SELECT id, name, avatar_url FROM users WHERE id = ?", senderID).Scan(&sender)

	// Build outgoing payload
	outMsg := map[string]interface{}{
		"type":            "message",
		"conversation_id": convID,
		"message": map[string]interface{}{
			"id":              msgID,
			"conversation_id": convID,
			"sender_id":       senderID,
			"type":            msgContentType,
			"content":         content,
			"file_url":        fileURL,
			"created_at":      createdAt.Format(time.RFC3339),
			"sender": map[string]interface{}{
				"id":         sender.ID,
				"name":       sender.Name,
				"avatar_url": sender.AvatarURL,
			},
		},
	}
	outBytes, _ := json.Marshal(outMsg)

	// Get all members of the conversation
	var memberIDs []string
	if err := h.DB.Raw("SELECT user_id FROM conversation_members WHERE conversation_id = ?", convID).Scan(&memberIDs).Error; err != nil {
		log.Println("Failed to get members:", err)
		return
	}

	// Collect stale clients to remove (can't delete while holding RLock)
	var toRemove []string

	h.mu.RLock()
	for _, mID := range memberIDs {
		if client, ok := h.Clients[mID]; ok {
			select {
			case client.Send <- outBytes:
			default:
				// Channel full — mark for removal
				toRemove = append(toRemove, mID)
			}
		}
	}
	h.mu.RUnlock()

	// Remove stale clients with a write lock
	if len(toRemove) > 0 {
		h.mu.Lock()
		for _, mID := range toRemove {
			if client, ok := h.Clients[mID]; ok {
				close(client.Send)
				delete(h.Clients, mID)
			}
		}
		h.mu.Unlock()
	}
}

func (h *Hub) BroadcastToConversation(convID, excludeUserID string, payload map[string]interface{}) {
	data, _ := json.Marshal(payload)

	var memberIDs []string
	h.DB.Raw("SELECT user_id FROM conversation_members WHERE conversation_id = ?", convID).Scan(&memberIDs)

	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, mID := range memberIDs {
		if mID == excludeUserID {
			continue
		}
		if client, ok := h.Clients[mID]; ok {
			select {
			case client.Send <- data:
			default:
			}
		}
	}
}

func (h *Hub) BroadcastToUsers(userIDs []string, payload map[string]interface{}) {
	data, err := json.Marshal(payload)
	if err != nil {
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, uID := range userIDs {
		if client, ok := h.Clients[uID]; ok {
			select {
			case client.Send <- data:
			default:
			}
		}
	}
}

func (h *Hub) broadcastStatus(userID, status string) {
	statusMsg, _ := json.Marshal(map[string]string{
		"type":    status,
		"user_id": userID,
	})

	var memberIDs []string
	h.DB.Raw(`
		SELECT DISTINCT cm2.user_id
		FROM conversation_members cm1
		JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
		JOIN users u ON u.id = cm2.user_id
		WHERE cm1.user_id = ? AND cm2.user_id != ? AND u.is_online = true
	`, userID, userID).Scan(&memberIDs)

	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, mID := range memberIDs {
		if client, ok := h.Clients[mID]; ok {
			select {
			case client.Send <- statusMsg:
			default:
			}
		}
	}
}

func (h *Hub) maintainOnlineStatus(userID string) {
	ticker := time.NewTicker(4 * time.Minute)
	defer ticker.Stop()
	for {
		<-ticker.C
		h.mu.RLock()
		_, ok := h.Clients[userID]
		h.mu.RUnlock()
		if !ok {
			return
		}
		h.Redis.Set(context.Background(), "user:"+userID+":online", 1, 5*time.Minute)
	}
}

func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WS error user %s: %v", c.UserID, err)
			}
			break
		}

		var msg map[string]interface{}
		if err := json.Unmarshal(message, &msg); err == nil {
			msg["sender_id"] = c.UserID
			updated, _ := json.Marshal(msg)
			c.Hub.Broadcast <- updated
		}
	}
}

// WritePump: mỗi message gửi trong 1 WebSocket frame riêng biệt
// → client nhận từng JSON object sạch, không bị concatenate
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			// Gửi từng message riêng biệt — không gộp
			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			// Ping để giữ kết nối sống
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
