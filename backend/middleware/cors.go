package middleware

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func CORS() gin.HandlerFunc {
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000", "http://frontend:3000"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization", "X-Guest-Token"}
	config.AllowCredentials = true
	return cors.New(config)
}
