package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"omegle-backend/services"
)

func CreateGuestSession(c *gin.Context) {
	token, err := services.CreateGuestSession()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create guest session"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"guestToken": token})
}
