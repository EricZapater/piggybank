package users

import (
	"time"

	"github.com/google/uuid"
)

// User represents an application account.
type User struct {
	ID           uuid.UUID
	Email        string
	PasswordHash string
	Name         string
	CreatedAt    time.Time
}
