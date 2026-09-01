package handlers

import (
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"chat-app/internal/config"
	"chat-app/internal/models"
	"chat-app/internal/services"
	"chat-app/internal/websocket"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ChatHandler struct {
	chatService services.ChatService
	Cfg         *config.Config
	Hub         *websocket.Hub
}

func NewChatHandler(chatService services.ChatService, cfg *config.Config, hub *websocket.Hub) *ChatHandler {
	return &ChatHandler{chatService: chatService, Cfg: cfg, Hub: hub}
}

func (h *ChatHandler) GetConversations(c *gin.Context) {
	userID := c.GetString("user_id")

	conversations, err := h.chatService.GetConversations(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get conversations"})
		return
	}

	if conversations == nil {
		conversations = []models.Conversation{}
	}

	c.JSON(http.StatusOK, gin.H{"data": conversations})
}

func (h *ChatHandler) GetConversation(c *gin.Context) {
	userID := c.GetString("user_id")
	convID := c.Param("id")

	convUUID, err := uuid.Parse(convID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation ID"})
		return
	}

	isMember, _ := h.chatService.CheckMembership(c.Request.Context(), convUUID, userID)
	if !isMember {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not a member of this conversation"})
		return
	}

	conv, err := h.chatService.GetConversation(c.Request.Context(), convUUID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Conversation not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": conv})
}

type CreateConversationRequest struct {
	IsGroup   bool     `json:"is_group"`
	Name      string   `json:"name"`
	MemberIDs []string `json:"member_ids" binding:"required,min=1"`
}

func (h *ChatHandler) CreateConversation(c *gin.Context) {
	userID := c.GetString("user_id")
	var req CreateConversationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	conv, err := h.chatService.CreateConversation(c.Request.Context(), req.IsGroup, req.Name, userID, req.MemberIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create conversation"})
		return
	}

	if h.Hub != nil && conv != nil {
		var memberIDs []string
		for _, m := range conv.Members {
			memberIDs = append(memberIDs, m.ID.String())
		}
		h.Hub.BroadcastToUsers(memberIDs, map[string]interface{}{
			"type":         "new_conversation",
			"conversation": conv,
		})
	}

	c.JSON(http.StatusCreated, gin.H{"data": conv})
}

func (h *ChatHandler) GetMessages(c *gin.Context) {
	userID := c.GetString("user_id")
	convID := c.Param("id")

	convUUID, err := uuid.Parse(convID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation ID"})
		return
	}
	isMember, _ := h.chatService.CheckMembership(c.Request.Context(), convUUID, userID)
	if !isMember {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not a member of this conversation"})
		return
	}

	limitStr := c.DefaultQuery("limit", "50")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 50
	}
	before := c.Query("before")

	messages, err := h.chatService.GetMessages(c.Request.Context(), convUUID, before, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get messages"})
		return
	}

	if messages == nil {
		messages = []models.Message{}
	}

	c.JSON(http.StatusOK, gin.H{"data": messages})
}

type AddMembersRequest struct {
	MemberIDs []string `json:"member_ids" binding:"required,min=1"`
}

func (h *ChatHandler) AddMembers(c *gin.Context) {
	userID := c.GetString("user_id")
	convID := c.Param("id")

	ctx := c.Request.Context()

	convUUID, err := uuid.Parse(convID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation ID"})
		return
	}

	var req AddMembersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	isAdmin, _ := h.chatService.CheckAdminRole(ctx, convUUID, userID)
	if !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to add members"})
		return
	}

	if err := h.chatService.AddMembers(ctx, convUUID, req.MemberIDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add members"})
		return
	}

	if h.Hub != nil {
		conv, _ := h.chatService.GetConversation(ctx, convUUID)
		if conv != nil {
			var memberIDs []string
			for _, m := range conv.Members {
				memberIDs = append(memberIDs, m.ID.String())
			}
			h.Hub.BroadcastToUsers(memberIDs, map[string]interface{}{
				"type":         "new_conversation",
				"conversation": conv,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Members added successfully"})
}

func (h *ChatHandler) UploadFile(c *gin.Context) {
	userID := c.GetString("user_id")
	convID := c.Param("id")
	ctx := c.Request.Context()

	convUUID, err := uuid.Parse(convID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation ID"})
		return
	}

	isMember, _ := h.chatService.CheckMembership(ctx, convUUID, userID)
	if !isMember {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not a member of this conversation"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to get file"})
		return
	}

	msgType := c.DefaultPostForm("type", "file")
	content := c.DefaultPostForm("content", file.Filename)

	ext := filepath.Ext(file.Filename)
	newFilename := uuid.New().String() + ext
	uploadPath := filepath.Join(h.Cfg.UploadDir, newFilename)

	if err := os.MkdirAll(h.Cfg.UploadDir, os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	if err := c.SaveUploadedFile(file, uploadPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	fileURL := "/uploads/" + newFilename

	msg := models.Message{
		ConversationID: convID,
		SenderID:       userID,
		Type:           msgType,
		Content:        content,
		FileURL:        fileURL,
	}

	if err := h.chatService.CreateMessage(ctx, &msg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save message"})
		return
	}

	savedMsg, _ := h.chatService.GetMessage(ctx, msg.ID)

	if h.Hub != nil && savedMsg != nil {
		h.Hub.BroadcastToConversation(convID, userID, map[string]interface{}{
			"type":            "message",
			"conversation_id": convID,
			"message":         savedMsg,
		})
	}

	c.JSON(http.StatusCreated, gin.H{"data": savedMsg})
}
