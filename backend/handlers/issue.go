package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"omegle-backend/config"
	"omegle-backend/middleware"
	"omegle-backend/models"
	"omegle-backend/services"
)

type issueRequest struct {
	Message string `json:"message" binding:"required"`
}

// optionalUserID returns the user id from a valid (non-guest) Bearer JWT, or "".
func optionalUserID(c *gin.Context) string {
	authHeader := c.GetHeader("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return ""
	}
	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
	claims := &middleware.Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
		return []byte(config.App.JWTSecret), nil
	})
	if err != nil || !token.Valid || claims.IsGuest {
		return ""
	}
	return claims.UserID
}

// SubmitIssue records a user-reported issue. Stores userId (for signed-in users),
// the message, and the client IP.
func SubmitIssue(c *gin.Context) {
	var req issueRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "message is required"})
		return
	}
	msg := strings.TrimSpace(req.Message)
	if msg == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "message is required"})
		return
	}
	if len(msg) > 2000 {
		msg = msg[:2000]
	}

	issue := models.Issue{
		UserID:    optionalUserID(c),
		Message:   msg,
		IP:        c.ClientIP(),
		CreatedAt: time.Now(),
	}
	if _, err := services.DB.Collection("issues").InsertOne(context.Background(), issue); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save issue"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "issue submitted"})
}
