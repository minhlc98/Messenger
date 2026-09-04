package websocket

import (
	"chat-app/internal/dto"
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 1024 * 1024 // 1MB
	redisChannel   = "ws_broadcast"
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

type RedisBroadcastMsg struct {
	UserIDs []string        `json:"user_ids"`
	Payload json.RawMessage `json:"payload"`
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
	go h.subscribeRedis()

	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			if existing, ok := h.Clients[client.UserID]; ok {
				existing.Conn.Close()
			}
			h.Clients[client.UserID] = client
			h.mu.Unlock()

			h.DB.Exec("UPDATE users SET is_online = true WHERE id = ?", client.UserID)

			h.broadcastStatus(client.UserID, "online")

		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.Clients[client.UserID]; ok {
				delete(h.Clients, client.UserID)
				close(client.Send)
			}
			h.mu.Unlock()

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
		var wsTypingMsg dto.WSTypingMessageType
		if err := json.Unmarshal(message, &wsTypingMsg); err != nil {
			log.Println("Invalid typing message:", err)
			return
		}
		h.BroadcastToConversation(wsTypingMsg.ConversationID, wsTypingMsg.SenderID, map[string]interface{}{
			"type":            "typing",
			"conversation_id": wsTypingMsg.ConversationID,
			"user_id":         wsTypingMsg.SenderID,
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

	h.publishToRedis(memberIDs, outBytes)
}

func (h *Hub) BroadcastToConversation(convID, excludeUserID string, payload map[string]interface{}) {
	data, _ := json.Marshal(payload)

	var memberIDs []string
	h.DB.Raw("SELECT user_id FROM conversation_members WHERE conversation_id = ?", convID).Scan(&memberIDs)

	var targetIDs []string
	for _, mID := range memberIDs {
		if mID != excludeUserID {
			targetIDs = append(targetIDs, mID)
		}
	}
	h.publishToRedis(targetIDs, data)
}

func (h *Hub) BroadcastToUsers(userIDs []string, payload map[string]interface{}) {
	data, err := json.Marshal(payload)
	if err != nil {
		return
	}

	h.publishToRedis(userIDs, data)
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

	h.publishToRedis(memberIDs, statusMsg)
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

func (h *Hub) publishToRedis(userIDs []string, payload []byte) {
	if len(userIDs) == 0 {
		return
	}

	msg := RedisBroadcastMsg{
		UserIDs: userIDs,
		Payload: payload,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		log.Println("Failed to marshal redis broadcast message:", err)
		return
	}

	if err := h.Redis.Publish(context.Background(), redisChannel, data).Err(); err != nil {
		log.Println("Failed to publish to redis:", err)
	}
}

func (h *Hub) subscribeRedis() {
	pubsub := h.Redis.Subscribe(context.Background(), redisChannel)
	defer pubsub.Close()

	ch := pubsub.Channel()
	for msg := range ch {
		var broadcastMsg RedisBroadcastMsg
		if err := json.Unmarshal([]byte(msg.Payload), &broadcastMsg); err != nil {
			log.Println("Invalid redis broadcast message:", err)
			continue
		}

		var toRemove []string
		h.mu.RLock()
		for _, uID := range broadcastMsg.UserIDs {
			if client, ok := h.Clients[uID]; ok {
				select {
				case client.Send <- broadcastMsg.Payload:
				default:
					toRemove = append(toRemove, uID)
				}
			}
		}
		h.mu.RUnlock()

		if len(toRemove) > 0 {
			h.mu.Lock()
			for _, uID := range toRemove {
				if client, ok := h.Clients[uID]; ok {
					close(client.Send)
					delete(h.Clients, uID)
				}
			}
			h.mu.Unlock()
		}
	}
}
