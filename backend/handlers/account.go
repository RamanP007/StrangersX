package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
	"omegle-backend/models"
	"omegle-backend/services"
)

// AcceptTerms records explicit Terms & Conditions acceptance for the user.
func AcceptTerms(c *gin.Context) {
	if isGuest, _ := c.Get("isGuest"); isGuest == true {
		c.JSON(http.StatusForbidden, gin.H{"error": "guests have no account"})
		return
	}

	userIDVal, _ := c.Get("userId")
	uid, err := primitive.ObjectIDFromHex(userIDVal.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	now := time.Now()
	update := bson.M{"$set": bson.M{
		"termsAndConditionAccepted":   true,
		"termsAndConditionAcceptedAt": now,
	}}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)

	var user models.User
	err = services.DB.Collection("users").
		FindOneAndUpdate(context.Background(), bson.M{"_id": uid}, update, opts).
		Decode(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "update failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": user})
}

type updateUsernameRequest struct {
	Username string `json:"username" binding:"required"`
}

// UpdateUsername changes the authenticated user's username (validated + unique).
func UpdateUsername(c *gin.Context) {
	if isGuest, _ := c.Get("isGuest"); isGuest == true {
		c.JSON(http.StatusForbidden, gin.H{"error": "guests cannot set a username"})
		return
	}

	var req updateUsernameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username is required"})
		return
	}

	clean, err := services.ValidateUsername(req.Username)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userIDVal, _ := c.Get("userId")
	uid, err := primitive.ObjectIDFromHex(userIDVal.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	ctx := context.Background()
	available, err := services.IsUsernameAvailable(ctx, clean, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "availability check failed"})
		return
	}
	if !available {
		c.JSON(http.StatusConflict, gin.H{"error": "username already taken"})
		return
	}

	update := bson.M{"$set": bson.M{"username": clean, "usernameConfirmed": true}}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)

	var user models.User
	err = services.DB.Collection("users").
		FindOneAndUpdate(ctx, bson.M{"_id": uid}, update, opts).
		Decode(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "update failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

type updatePreferencesRequest struct {
	ShowUsername *bool `json:"showUsername" binding:"required"`
}

// UpdatePreferences updates account-level chat preferences, e.g. whether the
// user's username is shown to matched strangers instead of "Stranger".
func UpdatePreferences(c *gin.Context) {
	if isGuest, _ := c.Get("isGuest"); isGuest == true {
		c.JSON(http.StatusForbidden, gin.H{"error": "guests have no account"})
		return
	}

	var req updatePreferencesRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.ShowUsername == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "showUsername is required"})
		return
	}

	userIDVal, _ := c.Get("userId")
	uid, err := primitive.ObjectIDFromHex(userIDVal.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	update := bson.M{"$set": bson.M{"showUsername": *req.ShowUsername}}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)

	var user models.User
	err = services.DB.Collection("users").
		FindOneAndUpdate(context.Background(), bson.M{"_id": uid}, update, opts).
		Decode(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "update failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": user})
}

// ConfirmUsername marks the current (auto-assigned) username as confirmed.
func ConfirmUsername(c *gin.Context) {
	if isGuest, _ := c.Get("isGuest"); isGuest == true {
		c.JSON(http.StatusForbidden, gin.H{"error": "guests have no username"})
		return
	}

	userIDVal, _ := c.Get("userId")
	uid, err := primitive.ObjectIDFromHex(userIDVal.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	update := bson.M{"$set": bson.M{"usernameConfirmed": true}}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)

	var user models.User
	err = services.DB.Collection("users").
		FindOneAndUpdate(context.Background(), bson.M{"_id": uid}, update, opts).
		Decode(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "update failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

// DeleteAccount permanently removes the authenticated user.
func DeleteAccount(c *gin.Context) {
	if isGuest, _ := c.Get("isGuest"); isGuest == true {
		c.JSON(http.StatusForbidden, gin.H{"error": "guests have no account to delete"})
		return
	}

	userIDVal, _ := c.Get("userId")
	uid, err := primitive.ObjectIDFromHex(userIDVal.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	ctx := context.Background()
	if _, err := services.DB.Collection("users").DeleteOne(ctx, bson.M{"_id": uid}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "delete failed"})
		return
	}
	_ = services.RevokeJWTSession(uid.Hex())

	c.JSON(http.StatusOK, gin.H{"message": "account deleted"})
}

// CheckUsername reports whether a username is valid and available.
func CheckUsername(c *gin.Context) {
	name := c.Query("username")
	clean, err := services.ValidateUsername(name)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"available": false, "reason": err.Error()})
		return
	}

	var excludeID primitive.ObjectID
	if userIDVal, ok := c.Get("userId"); ok {
		if uid, err := primitive.ObjectIDFromHex(userIDVal.(string)); err == nil {
			excludeID = uid
		}
	}

	available, err := services.IsUsernameAvailable(context.Background(), clean, excludeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "check failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"available": available})
}
