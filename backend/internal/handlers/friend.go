package handlers

import (
	"fmt"
	"net/http"

	"chat-app/internal/services"
	"chat-app/internal/websocket"

	"github.com/gin-gonic/gin"
)

type FriendHandler struct {
	friendService services.FriendService
	Hub           *websocket.Hub
}

func NewFriendHandler(srv services.FriendService, hub *websocket.Hub) *FriendHandler {
	return &FriendHandler{friendService: srv, Hub: hub}
}

type FriendRequestReq struct {
	AddresseeID string `json:"addressee_id" binding:"required"`
}

func (h *FriendHandler) SendFriendRequest(c *gin.Context) {
	requesterID := c.GetString("user_id")
	var req FriendRequestReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if requesterID == req.AddresseeID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Không thể gửi lời mời cho bản thân"})
		return
	}

	err := h.friendService.SendFriendRequest(c.Request.Context(), requesterID, req.AddresseeID)
	if err != nil {
		fmt.Println(err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send request"})
		return
	}

	if h.Hub != nil {
		memberIDs := []string{req.AddresseeID}
		h.Hub.BroadcastToUsers(memberIDs, map[string]interface{}{
			"type": "friend_request",
			"data": map[string]interface{}{
				"requester_id": requesterID,
				"message":      "Bạn có một lời mời kết bạn mới",
			},
		})
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Đã gửi lời mời kết bạn"})
}

func (h *FriendHandler) GetPendingRequests(c *gin.Context) {
	userID := c.GetString("user_id")

	requests, err := h.friendService.GetPendingRequests(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get requests"})
		return
	}

	if requests == nil {
		c.JSON(http.StatusOK, gin.H{"data": []interface{}{}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": requests})
}

func (h *FriendHandler) AcceptFriendRequest(c *gin.Context) {
	userID := c.GetString("user_id")
	requestID := c.Param("id")

	success, err := h.friendService.AcceptFriendRequest(c.Request.Context(), userID, requestID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to accept request"})
		return
	}

	if !success {
		c.JSON(http.StatusNotFound, gin.H{"error": "Request not found or not pending"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Đã chấp nhận lời mời kết bạn"})
}

func (h *FriendHandler) RejectFriendRequest(c *gin.Context) {
	userID := c.GetString("user_id")
	requestID := c.Param("id")

	success, err := h.friendService.RejectFriendRequest(c.Request.Context(), userID, requestID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject request"})
		return
	}

	if !success {
		c.JSON(http.StatusNotFound, gin.H{"error": "Request not found or not pending"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Đã từ chối lời mời kết bạn"})
}

func (h *FriendHandler) GetFriends(c *gin.Context) {
	userID := c.GetString("user_id")

	friends, err := h.friendService.GetFriends(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get friends"})
		return
	}

	if friends == nil {
		c.JSON(http.StatusOK, gin.H{"data": []interface{}{}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": friends})
}
