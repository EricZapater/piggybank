package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/piggybank/backend/internal/common/response"
	"github.com/piggybank/backend/internal/users"
)

type contextKey string

const userContextKey contextKey = "authenticatedUser"

// Middleware validates JWT tokens and attaches the user to the request context.
type Middleware struct {
	manager Manager
	users   users.Repository
}

// NewMiddleware constructs an auth middleware instance.
func NewMiddleware(manager Manager, repo users.Repository) Middleware {
	return Middleware{manager: manager, users: repo}
}

// Authenticate wraps handlers requiring a valid JWT token.
func (m Middleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenString := extractToken(r.Header.Get("Authorization"))
		if tokenString == "" {
			response.Unauthorized(w, "missing authorization token")
			return
		}

		claims, err := m.manager.Parse(tokenString)
		if err != nil {
			response.Unauthorized(w, "invalid token")
			return
		}

		user, err := m.users.GetByID(r.Context(), claims.UserID)
		if err != nil {
			response.Unauthorized(w, "user not found")
			return
		}

		ctx := context.WithValue(r.Context(), userContextKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GinAuthenticate is the Gin version of the authentication middleware.
func (m Middleware) GinAuthenticate(c *gin.Context) {
	tokenString := extractToken(c.GetHeader("Authorization"))
	if tokenString == "" {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing authorization token"})
		return
	}

	claims, err := m.manager.Parse(tokenString)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	user, err := m.users.GetByID(c.Request.Context(), claims.UserID)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	ctx := context.WithValue(c.Request.Context(), userContextKey, user)
	c.Request = c.Request.WithContext(ctx)
	c.Next()
}

// UserFromContext retrieves the authenticated user stored by the middleware.
func UserFromContext(ctx context.Context) (users.User, bool) {
	value := ctx.Value(userContextKey)
	if value == nil {
		return users.User{}, false
	}

	user, ok := value.(users.User)
	return user, ok
}

func extractToken(header string) string {
	if header == "" {
		return ""
	}

	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 {
		return ""
	}

	if !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}

	return strings.TrimSpace(parts[1])
}
