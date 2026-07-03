package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"omegle-backend/config"
	"omegle-backend/services"
)

type Claims struct {
	UserID  string `json:"userId"`
	Email   string `json:"email"`
	SID     string `json:"sid"` // session id (one active session per user)
	IsGuest bool   `json:"isGuest"`
	Admin   bool   `json:"admin"`
	jwt.RegisteredClaims
}

// AuthRequired accepts both JWT (logged-in) and guest token.
func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Try JWT first
		authHeader := c.GetHeader("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
			claims := &Claims{}
			token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
				return []byte(config.App.JWTSecret), nil
			})
			if err == nil && token.Valid {
				c.Set("userId", claims.UserID)
				c.Set("email", claims.Email)
				c.Set("isGuest", false)
				c.Next()
				return
			}
		}

		// Try guest token
		guestToken := c.GetHeader("X-Guest-Token")
		if guestToken == "" {
			guestToken = c.Query("guestToken")
		}
		if guestToken != "" && services.ValidateGuestSession(guestToken) {
			c.Set("userId", guestToken)
			c.Set("isGuest", true)
			c.Next()
			return
		}

		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
	}
}
