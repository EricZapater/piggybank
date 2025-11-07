package auth

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/piggybank/backend/internal/common/response"
	"github.com/piggybank/backend/internal/users"
)

// Handler provides HTTP handlers for authentication endpoints.
type Handler struct {
	service Service
}

// NewHandler constructs a Handler.
func NewHandler(service Service) Handler {
	return Handler{service: service}
}

type registerRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authResponse struct {
	Token string       `json:"token"`
	User  userResponse `json:"user"`
}

type userResponse struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

// Register handles POST /auth/register requests.
func (h Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid payload")
		return
	}

	user, token, err := h.service.Register(r.Context(), req.Email, req.Password, req.Name)
	if err != nil {
		if isValidationError(err) {
			response.BadRequest(w, err.Error())
			return
		}
		response.InternalError(w, err)
		return
	}

	response.JSON(w, http.StatusCreated, authResponse{
		Token: token,
		User:  mapUser(user),
	})
}

// Login handles POST /auth/login requests.
func (h Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid payload")
		return
	}

	user, token, err := h.service.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		if isValidationError(err) || errors.Is(err, ErrInvalidCredentials) {
			response.Unauthorized(w, err.Error())
			return
		}
		response.InternalError(w, err)
		return
	}

	response.JSON(w, http.StatusOK, authResponse{
		Token: token,
		User:  mapUser(user),
	})
}

// Me returns the authenticated user profile.
func (h Handler) Me(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "unauthenticated")
		return
	}

	response.JSON(w, http.StatusOK, mapUser(user))
}

func isValidationError(err error) bool {
	switch {
	case errors.Is(err, ErrEmailRequired):
		return true
	case errors.Is(err, ErrInvalidEmail):
		return true
	case errors.Is(err, ErrPasswordTooShort):
		return true
	case errors.Is(err, ErrNameRequired):
		return true
	case errors.Is(err, ErrEmailAlreadyRegistered):
		return true
	default:
		return false
	}
}

func mapUser(user users.User) userResponse {
	return userResponse{
		ID:    user.ID.String(),
		Email: user.Email,
		Name:  user.Name,
	}
}
