package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"omegle-backend/models"
	"omegle-backend/services"
)

type reportRequest struct {
	ReportedSocketID string `json:"reportedSocketId" binding:"required"`
	Reason           string `json:"reason"           binding:"required"`
	Note             string `json:"note"`
	RoomID           string `json:"roomId"`
}

func SubmitReport(c *gin.Context) {
	var req reportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	reporterID, _ := c.Get("userId")

	report := models.Report{
		ReporterID:       reporterID.(string),
		ReportedSocketID: req.ReportedSocketID,
		Reason:           req.Reason,
		Note:             req.Note,
		RoomID:           req.RoomID,
		CreatedAt:        time.Now(),
	}

	_, err := services.DB.Collection("reports").InsertOne(context.Background(), report)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save report"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "report submitted"})
}
