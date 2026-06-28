package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"omegle-backend/config"
	"omegle-backend/handlers"
	"omegle-backend/middleware"
	"omegle-backend/services"
)

func main() {
	config.Load()

	services.ConnectMongo(config.App.MongoURI)
	services.ConnectRedis(config.App.RedisURI)
	services.ResetOnlineCount()
	services.ResetMatchmaking()

	r := gin.Default()
	r.Use(middleware.CORS())

	// WebSocket endpoints
	r.GET("/ws", func(c *gin.Context) {
		services.ServeWS(c.Writer, c.Request)
	})
	r.GET("/ws/presence", func(c *gin.Context) {
		services.ServePresence(c.Writer, c.Request)
	})

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Live online count (also pushed over /ws/presence)
	r.GET("/api/online", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"count": services.GetOnlineCount()})
	})

	// REST API
	api := r.Group("/api")
	{
		api.POST("/auth/google", handlers.GoogleAuth)
		api.POST("/guest/session", handlers.CreateGuestSession)

		protected := api.Group("")
		protected.Use(middleware.AuthRequired())
		{
			protected.GET("/me", handlers.Me)
			protected.POST("/report", handlers.SubmitReport)
			protected.POST("/me/terms/accept", handlers.AcceptTerms)
			protected.GET("/username/check", handlers.CheckUsername)
			protected.PATCH("/me/username", handlers.UpdateUsername)
			protected.POST("/me/username/confirm", handlers.ConfirmUsername)
			protected.DELETE("/me", handlers.DeleteAccount)
		}
	}

	addr := fmt.Sprintf(":%s", config.App.Port)
	log.Printf("Server running on port %s", config.App.Port)
	if err := r.Run(addr); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
