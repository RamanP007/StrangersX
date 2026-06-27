package middleware

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	appcfg "omegle-backend/config"
)

func CORS() gin.HandlerFunc {
	c := cors.DefaultConfig()
	c.AllowOrigins = appcfg.App.AllowedOrigins
	c.AllowMethods = []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"}
	c.AllowHeaders = []string{"Origin", "Content-Type", "Authorization", "X-Guest-Token"}
	c.AllowCredentials = true
	return cors.New(c)
}
