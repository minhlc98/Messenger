package router

import (
	"chat-app/internal/config"
	"chat-app/internal/handlers"
	"chat-app/internal/middleware"
	"chat-app/internal/repositories"
	"chat-app/internal/services"
	"chat-app/internal/websocket"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func Setup(r *gin.Engine, db *gorm.DB, cfg *config.Config, hub *websocket.Hub) {
	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	r.Use(gin.Recovery())

	// Serve uploaded files
	r.Static("/uploads", cfg.UploadDir)

	userRepository := repositories.NewUserRepository(db)
	friendRepository := repositories.NewFriendRepository(db)
	chatRepository := repositories.NewChatRepository(db)

	userService := services.NewUserService(userRepository)
	authService := services.NewAuthService(cfg, userRepository)
	friendService := services.NewFriendService(friendRepository)
	chatService := services.NewChatService(chatRepository)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	userHandler := handlers.NewUserHandler(userService, cfg)
	friendHandler := handlers.NewFriendHandler(friendService, hub)
	chatHandler := handlers.NewChatHandler(chatService, cfg, hub)
	wsHandler := handlers.NewWSHandler(hub, cfg)

	// WebSocket (no auth middleware, uses token query param)
	r.GET("/ws", wsHandler.ServeWS)

	api := r.Group("/api")
	{
		// Public auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.Refresh)
		}

		// Protected routes
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware(cfg))
		{
			// Users
			users := protected.Group("/users")
			{
				users.GET("/me", userHandler.GetMe)
				users.PUT("/me", userHandler.UpdateMe)
				users.PUT("/me/avatar", userHandler.UploadAvatar)
				users.GET("/search", userHandler.SearchUsers)
				users.GET("/:id", userHandler.GetUserByID)
			}

			// Friends
			friends := protected.Group("/friends")
			{
				friends.GET("", friendHandler.GetFriends)
				friends.POST("/request", friendHandler.SendFriendRequest)
				friends.GET("/requests", friendHandler.GetPendingRequests)
				friends.PUT("/requests/:id/accept", friendHandler.AcceptFriendRequest)
				friends.PUT("/requests/:id/reject", friendHandler.RejectFriendRequest)
			}

			// Conversations
			conversations := protected.Group("/conversations")
			{
				conversations.GET("", chatHandler.GetConversations)
				conversations.POST("", chatHandler.CreateConversation)
				conversations.GET("/:id", chatHandler.GetConversation)
				conversations.GET("/:id/messages", chatHandler.GetMessages)
				conversations.POST("/:id/members", chatHandler.AddMembers)
				conversations.POST("/:id/upload", chatHandler.UploadFile)
			}
		}
	}
}
