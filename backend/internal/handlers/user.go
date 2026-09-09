package handlers

import (
	"fmt"
	"net/http"
	"path/filepath"

	"chat-app/internal/config"
	"chat-app/internal/models"
	"chat-app/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UserHandler struct {
	userService    services.UserService
	storageService services.StorageService
	cfg            *config.Config
}

func NewUserHandler(userService services.UserService, storageService services.StorageService, cfg *config.Config) *UserHandler {
	return &UserHandler{userService: userService, storageService: storageService, cfg: cfg}
}

func (h *UserHandler) GetMe(c *gin.Context) {
	userID := c.GetString("user_id")

	user, err := h.userService.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found or db error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": user})
}

func (h *UserHandler) GetUserByID(c *gin.Context) {
	id := c.Param("id")

	user, err := h.userService.GetUserByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": user})
}

type UpdateMeRequest struct {
	Name string `json:"name" binding:"required"`
}

func (h *UserHandler) UpdateMe(c *gin.Context) {
	userID := c.GetString("user_id")
	var req UpdateMeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userService.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	user.Name = req.Name
	if err := h.userService.UpdateUser(c.Request.Context(), user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": user})
}

func (h *UserHandler) UploadAvatar(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.GetString("user_id")

	file, err := c.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Không thể mở file"})
		return
	}

	user, err := h.userService.GetUserByID(ctx, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	ext := filepath.Ext(file.Filename)
	newFilename := fmt.Sprintf("avatars/%s%s", uuid.New().String(), ext)

	reader, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open file"})
		return
	}
	defer reader.Close()

	contentType := file.Header.Get("Content-Type")
	fileURL, err := h.storageService.Upload(ctx, newFilename, contentType, reader)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Cập nhật ảnh đại diện thất bại"})
		return
	}

	user.AvatarURL = fileURL
	if err := h.userService.UpdateUser(ctx, user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Cập nhật ảnh đại diện thất bại"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": user})
}

func (h *UserHandler) SearchUsers(c *gin.Context) {
	email := c.Query("email")
	if email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email parameter is required"})
		return
	}

	users, err := h.userService.SearchUsers(c.Request.Context(), email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if users == nil {
		// Just to be sure it returns [] instead of null
		// though gin typically handles nil slices fine.
		users = make([]models.User, 0)
	}

	c.JSON(http.StatusOK, gin.H{"data": users, "total": len(users)})
}
