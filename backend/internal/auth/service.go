package auth

import (
	"context"
	"errors"
	"net/mail"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/piggybank/backend/internal/users"
)

var (
	ErrEmailRequired          = errors.New("email is required")
	ErrInvalidEmail           = errors.New("invalid email format")
	ErrPasswordTooShort       = errors.New("password must be at least 8 characters")
	ErrNameRequired           = errors.New("name is required")
	ErrEmailAlreadyRegistered = errors.New("email already registered")
	ErrInvalidCredentials     = errors.New("invalid credentials")
)

// Service encapsulates the business logic for authentication.
type Service struct {
	users      users.Repository
	jwtManager Manager
}

// NewService constructs a Service instance.
func NewService(repo users.Repository, manager Manager) Service {
	return Service{users: repo, jwtManager: manager}
}

// Register registers a new user and returns a signed JWT.
func (s Service) Register(ctx context.Context, email, password, name string) (users.User, string, error) {
	if err := validateEmail(email); err != nil {
		return users.User{}, "", err
	}

	if err := validatePassword(password); err != nil {
		return users.User{}, "", err
	}

	email = strings.ToLower(strings.TrimSpace(email))
	name = strings.TrimSpace(name)

	if name == "" {
		return users.User{}, "", ErrNameRequired
	}

	if _, err := s.users.GetByEmail(ctx, email); err == nil {
		return users.User{}, "", ErrEmailAlreadyRegistered
	} else if !errors.Is(err, users.ErrNotFound) {
		return users.User{}, "", err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return users.User{}, "", err
	}

	user := users.User{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: string(hash),
		Name:         name,
		CreatedAt:    time.Now().UTC(),
	}

	if err := s.users.Create(ctx, user); err != nil {
		return users.User{}, "", err
	}

	token, err := s.jwtManager.GenerateAccessToken(user.ID)
	if err != nil {
		return users.User{}, "", err
	}

	return user, token, nil
}

// Login validates credentials and returns a signed JWT.
func (s Service) Login(ctx context.Context, email, password string) (users.User, string, error) {
	if err := validateEmail(email); err != nil {
		return users.User{}, "", err
	}

	email = strings.ToLower(strings.TrimSpace(email))

	user, err := s.users.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, users.ErrNotFound) {
			return users.User{}, "", ErrInvalidCredentials
		}
		return users.User{}, "", err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return users.User{}, "", ErrInvalidCredentials
	}

	token, err := s.jwtManager.GenerateAccessToken(user.ID)
	if err != nil {
		return users.User{}, "", err
	}

	return user, token, nil
}

func validateEmail(email string) error {
	email = strings.TrimSpace(email)
	if email == "" {
		return ErrEmailRequired
	}

	if _, err := mail.ParseAddress(email); err != nil {
		return ErrInvalidEmail
	}
	return nil
}

func validatePassword(password string) error {
	if len(password) < 8 {
		return ErrPasswordTooShort
	}
	return nil
}
