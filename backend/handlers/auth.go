package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
	"omegle-backend/config"
	"omegle-backend/middleware"
	"omegle-backend/models"
	"omegle-backend/services"
)

type googleAuthRequest struct {
	IDToken       string `json:"idToken"       binding:"required"`
	TermsAccepted bool   `json:"termsAccepted"`
}

type googleTokenInfo struct {
	Sub     string `json:"sub"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
	Aud     string `json:"aud"`
	Error   string `json:"error_description"`
}

func verifyGoogleToken(idToken string) (*googleTokenInfo, error) {
	url := "https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken
	resp, err := http.Get(url) //nolint:gosec
	if err != nil {
		return nil, fmt.Errorf("tokeninfo request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	var info googleTokenInfo
	if err := json.Unmarshal(body, &info); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}
	if info.Error != "" {
		return nil, fmt.Errorf("invalid token: %s", info.Error)
	}
	if info.Aud != config.App.GoogleClientID {
		return nil, fmt.Errorf("token audience mismatch")
	}
	return &info, nil
}

func GoogleAuth(c *gin.Context) {
	var req googleAuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "idToken is required"})
		return
	}
	// Note: Terms & Conditions are now accepted explicitly via an in-app popup
	// (POST /api/me/terms/accept), tracked by termsAndConditionAccepted — so we
	// no longer block login here.

	info, err := verifyGoogleToken(req.IDToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid Google token"})
		return
	}

	ctx := context.Background()
	now := time.Now()
	collection := services.DB.Collection("users")
	filter := bson.M{"googleId": info.Sub}

	// Assign a random unique username only on first signup.
	username, err := services.GenerateUniqueUsername(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "username generation failed"})
		return
	}

	update := bson.M{
		"$set": bson.M{
			"email":           info.Email,
			"name":            info.Name,
			"avatar":          info.Picture,
			"termsAccepted":   true,
			"termsAcceptedAt": now,
		},
		"$setOnInsert": bson.M{
			"googleId":                  info.Sub,
			"username":                  username,
			"usernameConfirmed":         false,
			"termsAndConditionAccepted": false,
			"createdAt":                 now,
			"reportCount":               0,
		},
	}
	opts := options.FindOneAndUpdate().
		SetUpsert(true).
		SetReturnDocument(options.After)

	var user models.User
	if err := collection.FindOneAndUpdate(ctx, filter, update, opts).Decode(&user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	// Self-heal: backfill a username for any legacy user that predates this field.
	// (No manual DB migration required.)
	if user.Username == "" {
		backfill := bson.M{"$set": bson.M{"username": username, "usernameConfirmed": false}}
		_ = collection.FindOneAndUpdate(ctx, filter, backfill, opts).Decode(&user)
	}

	tokenStr, err := issueJWT(user.ID.Hex(), info.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token generation failed"})
		return
	}
	if err := services.StoreJWTSession(user.ID.Hex(), tokenStr); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "session error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": tokenStr, "user": user})
}

func issueJWT(userID, email string) (string, error) {
	claims := middleware.Claims{
		UserID:  userID,
		Email:   email,
		IsGuest: false,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   userID,
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.App.JWTSecret))
}

func Me(c *gin.Context) {
	userID, _ := c.Get("userId")
	uid, err := primitive.ObjectIDFromHex(userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	var user models.User
	if err := services.DB.Collection("users").
		FindOne(context.Background(), bson.M{"_id": uid}).
		Decode(&user); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": user})
}
