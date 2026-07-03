package handlers

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"omegle-backend/config"
	"omegle-backend/middleware"
	"omegle-backend/models"
	"omegle-backend/services"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type adminLoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// AdminLogin checks the credentials from env and issues an admin JWT.
func AdminLogin(c *gin.Context) {
	var req adminLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username and password required"})
		return
	}
	fmt.Println("Admin Username and Password", req.Username, req.Password, config.App.AdminUsername, config.App.AdminPassword, req.Username != config.App.AdminUsername, req.Password != config.App.AdminPassword)
	if req.Username != config.App.AdminUsername || req.Password != config.App.AdminPassword {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	claims := middleware.Claims{
		Admin: true,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(12 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   "admin",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(config.App.JWTSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": signed})
}

func AdminStats(c *gin.Context) {
	ctx := context.Background()
	users := services.DB.Collection("users")
	issues := services.DB.Collection("issues")
	reports := services.DB.Collection("reports")

	totalUsers, _ := users.CountDocuments(ctx, bson.M{})
	bannedUsers, _ := users.CountDocuments(ctx, bson.M{"banned": true})
	totalIssues, _ := issues.CountDocuments(ctx, bson.M{})
	totalReports, _ := reports.CountDocuments(ctx, bson.M{})

	c.JSON(http.StatusOK, gin.H{
		"totalUsers":   totalUsers,
		"bannedUsers":  bannedUsers,
		"totalIssues":  totalIssues,
		"totalReports": totalReports,
		"online":       services.GetOnlineCount(),
	})
}

func AdminPlayers(c *gin.Context) {
	ctx := context.Background()
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(1000)
	cur, err := services.DB.Collection("users").Find(ctx, bson.M{}, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
		return
	}
	var players []models.User
	if err := cur.All(ctx, &players); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "decode failed"})
		return
	}
	if players == nil {
		players = []models.User{}
	}
	c.JSON(http.StatusOK, gin.H{"players": players})
}

func setBan(c *gin.Context, banned bool) {
	uid, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	set := bson.M{"banned": banned}
	if banned {
		now := time.Now()
		set["bannedAt"] = now
	} else {
		set["bannedAt"] = nil
	}
	if _, err := services.DB.Collection("users").
		UpdateOne(context.Background(), bson.M{"_id": uid}, bson.M{"$set": set}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "update failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "ok", "banned": banned})
}

func BanPlayer(c *gin.Context)   { setBan(c, true) }
func UnbanPlayer(c *gin.Context) { setBan(c, false) }

func AdminIssues(c *gin.Context) {
	ctx := context.Background()
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(1000)
	cur, err := services.DB.Collection("issues").Find(ctx, bson.M{}, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
		return
	}
	var issues []models.Issue
	if err := cur.All(ctx, &issues); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "decode failed"})
		return
	}
	if issues == nil {
		issues = []models.Issue{}
	}
	c.JSON(http.StatusOK, gin.H{"issues": issues})
}
