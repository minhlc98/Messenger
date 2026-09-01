package handlers

import (
	"net/http"
	"os"
	"path/filepath"

	"chat-app/internal/config"
	"chat-app/internal/models"
	"chat-app/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UserHandler struct {
	userService services.UserService
	cfg         *config.Config
}

func NewUserHandler(userService services.UserService, cfg *config.Config) *UserHandler {
	return &UserHandler{userService: userService, cfg: cfg}
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
	userID := c.GetString("user_id")

	file, err := c.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to get file"})
		return
	}

	ext := filepath.Ext(file.Filename)
	newFilename := uuid.New().String() + ext
	uploadPath := filepath.Join(h.cfg.UploadDir, newFilename)

	if err := os.MkdirAll(h.cfg.UploadDir, os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	if err := c.SaveUploadedFile(file, uploadPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	avatarURL := "/uploads/" + newFilename
	
	user, err := h.userService.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	
	user.AvatarURL = avatarURL
	if err := h.userService.UpdateUser(c.Request.Context(), user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update avatar in DB"})
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
