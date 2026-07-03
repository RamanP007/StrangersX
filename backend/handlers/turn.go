package handlers

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sync"
	"time"

	"omegle-backend/config"

	"github.com/gin-gonic/gin"
)

// Metered-issued ICE credentials are reused across clients for a short window so
// we don't hit the Metered API on every page load. The credentials themselves
// stay valid far longer than this cache TTL.
var (
	turnMu     sync.Mutex
	turnCache  []byte
	turnExpiry time.Time
)

const turnCacheTTL = 30 * time.Minute

var turnHTTP = &http.Client{Timeout: 6 * time.Second}

// TurnCredentials returns a WebRTC ICE-server list (STUN + TURN) for the browser.
// The Metered secret key is used here, server-side, and never sent to the client
// — only the short-lived TURN username/credential Metered issues are forwarded.
// Without Metered configured it returns an empty list and the client falls back
// to its built-in STUN servers (direct connections only — no relay).
func TurnCredentials(c *gin.Context) {
	domain := config.App.MeteredDomain
	key := config.App.MeteredSecretKey
	if domain == "" || key == "" {
		c.JSON(http.StatusOK, []any{})
		return
	}

	turnMu.Lock()
	defer turnMu.Unlock()

	if turnCache != nil && time.Now().Before(turnExpiry) {
		c.Data(http.StatusOK, "application/json", turnCache)
		return
	}

	endpoint := fmt.Sprintf("https://%s/api/v1/turn/credentials?apiKey=%s", domain, url.QueryEscape(key))
	resp, err := turnHTTP.Get(endpoint)
	if err != nil {
		// Serve stale credentials if we have any, else fall back to STUN-only.
		if turnCache != nil {
			c.Data(http.StatusOK, "application/json", turnCache)
			return
		}
		c.JSON(http.StatusOK, []any{})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil || resp.StatusCode != http.StatusOK {
		if turnCache != nil {
			c.Data(http.StatusOK, "application/json", turnCache)
			return
		}
		c.JSON(http.StatusOK, []any{})
		return
	}

	turnCache = body
	turnExpiry = time.Now().Add(turnCacheTTL)
	c.Data(http.StatusOK, "application/json", body)
}
