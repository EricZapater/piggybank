package users

import (
	"context"
	"errors"

	"github.com/google/uuid"
)

// Repository defines persistence operations for users.
type Repository interface {
	Create(ctx context.Context, user User) error
	GetByEmail(ctx context.Context, email string) (User, error)
	GetByID(ctx context.Context, id uuid.UUID) (User, error)
}

var ErrNotFound = errors.New("user not found")
