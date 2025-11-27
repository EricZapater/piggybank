package couples

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/piggybank/backend/internal/common/email"
	"github.com/piggybank/backend/internal/users"
)

var (
	ErrPartnerRequired      = errors.New("partner email is required")
	ErrInvalidPartnerEmail  = errors.New("invalid partner email")
	ErrCannotInviteSelf     = errors.New("cannot invite yourself")
	ErrAlreadyCoupled       = errors.New("user already belongs to a couple")
	ErrPendingRequestExists = errors.New("pending request already exists")
	ErrRequestNotFound      = errors.New("couple request not found")
	ErrRequestNotAuthorized = errors.New("not authorized to act on this request")
	ErrRequestNotPending    = errors.New("request is no longer pending")
)

// Service coordinates couple workflows across repositories.
type Service struct {
	store       Store
	users       users.Repository
	emailSender *email.Service
	baseURL     string
}

// NewService constructs a Service.
func NewService(store Store, usersRepo users.Repository, emailSender *email.Service, baseURL string) Service {
	return Service{
		store:       store,
		users:       usersRepo,
		emailSender: emailSender,
		baseURL:     baseURL,
	}
}

// RequestCouple sends a couple invitation to the specified partner email.
func (s Service) RequestCouple(ctx context.Context, requester users.User, partnerEmail string) (RequestView, users.User, error) {
	email := strings.TrimSpace(strings.ToLower(partnerEmail))
	if email == "" {
		return RequestView{}, users.User{}, ErrPartnerRequired
	}
	if _, err := mail.ParseAddress(email); err != nil {
		return RequestView{}, users.User{}, ErrInvalidPartnerEmail
	}

	target, err := s.users.GetByEmail(ctx, email)
	targetExists := err == nil
	if err != nil && !errors.Is(err, users.ErrNotFound) {
		return RequestView{}, users.User{}, err
	}

	if targetExists && target.ID == requester.ID {
		return RequestView{}, users.User{}, ErrCannotInviteSelf
	}

	if _, err := s.store.GetCoupleByUserID(ctx, requester.ID); err == nil {
		return RequestView{}, users.User{}, ErrAlreadyCoupled
	} else if !errors.Is(err, ErrNotFound) {
		return RequestView{}, users.User{}, err
	}

	if targetExists {
		if _, err := s.store.GetCoupleByUserID(ctx, target.ID); err == nil {
			return RequestView{}, users.User{}, ErrAlreadyCoupled
		} else if !errors.Is(err, ErrNotFound) {
			return RequestView{}, users.User{}, err
		}

		if _, err := s.store.FindPendingRequestBetween(ctx, requester.ID, target.ID); err == nil {
			return RequestView{}, users.User{}, ErrPendingRequestExists
		} else if !errors.Is(err, ErrNotFound) {
			return RequestView{}, users.User{}, err
		}

		if pending, err := s.store.ListPendingRequestsForUser(ctx, target.ID); err == nil && len(pending) > 0 {
			return RequestView{}, users.User{}, ErrPendingRequestExists
		} else if err != nil {
			return RequestView{}, users.User{}, err
		}
	}

	if pending, err := s.store.ListPendingRequestsForUser(ctx, requester.ID); err == nil && len(pending) > 0 {
		return RequestView{}, users.User{}, ErrPendingRequestExists
	} else if err != nil {
		return RequestView{}, users.User{}, err
	}

	now := time.Now().UTC()

	// Generate invitation token
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return RequestView{}, users.User{}, err
	}
	token := hex.EncodeToString(tokenBytes)

	req := CoupleRequest{
		ID:              uuid.New(),
		RequesterUserID: requester.ID,
		Status:          StatusPending,
		CreatedAt:       now,
		InvitationToken: &token,
	}

	if targetExists {
		req.TargetUserID = &target.ID
	} else {
		req.TargetEmail = &email
	}

	if err := s.store.CreateRequest(ctx, req); err != nil {
		return RequestView{}, users.User{}, err
	}

	// Send invitation email if email service is available
	if s.emailSender != nil {
		go func() {
			err := s.emailSender.SendInvitation(email, requester.Name, *req.InvitationToken)
			if err != nil {
				// Log the error (you might want to use a proper logger)
				fmt.Printf("Failed to send invitation email to %s: %v\n", email, err)
			} else {
				fmt.Printf("Invitation email sent to %s\n", email)
			}
		}()
	}

	view := RequestView{
		Request:   req,
		Direction: DirectionOutgoing,
	}

	if targetExists {
		view.PartnerID = target.ID
		return view, target, nil
	} else {
		// For non-existent users, create a dummy user object
		dummyUser := users.User{
			ID:    uuid.New(), // This won't be persisted
			Email: email,
			Name:  email, // Use email as name for display
		}
		view.PartnerID = dummyUser.ID
		return view, dummyUser, nil
	}
}

// AcceptCouple finalises a pending request and creates a couple.
func (s Service) AcceptCouple(ctx context.Context, requestID uuid.UUID, currentUserID uuid.UUID) (CoupleView, users.User, users.User, error) {
	req, err := s.store.GetRequestByID(ctx, requestID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return CoupleView{}, users.User{}, users.User{}, ErrRequestNotFound
		}
		return CoupleView{}, users.User{}, users.User{}, err
	}

	if req.Status != StatusPending {
		return CoupleView{}, users.User{}, users.User{}, ErrRequestNotPending
	}

	// Only allow accepting requests where the target user exists
	if req.TargetUserID == nil {
		return CoupleView{}, users.User{}, users.User{}, ErrRequestNotAuthorized
	}

	if *req.TargetUserID != currentUserID {
		return CoupleView{}, users.User{}, users.User{}, ErrRequestNotAuthorized
	}

	if _, err := s.store.GetCoupleByUserID(ctx, req.RequesterUserID); err == nil {
		return CoupleView{}, users.User{}, users.User{}, ErrAlreadyCoupled
	} else if !errors.Is(err, ErrNotFound) {
		return CoupleView{}, users.User{}, users.User{}, err
	}

	if _, err := s.store.GetCoupleByUserID(ctx, *req.TargetUserID); err == nil {
		return CoupleView{}, users.User{}, users.User{}, ErrAlreadyCoupled
	} else if !errors.Is(err, ErrNotFound) {
		return CoupleView{}, users.User{}, users.User{}, err
	}

	now := time.Now().UTC()
	couple := Couple{
		ID:             uuid.New(),
		Partner1UserID: req.RequesterUserID,
		Partner2UserID: *req.TargetUserID,
		CreatedAt:      now,
	}

	if err := s.store.AcceptRequestWithCouple(ctx, req.ID, couple, now); err != nil {
		if errors.Is(err, ErrNotFound) {
			return CoupleView{}, users.User{}, users.User{}, ErrRequestNotPending
		}
		return CoupleView{}, users.User{}, users.User{}, err
	}

	requester, err := s.users.GetByID(ctx, req.RequesterUserID)
	if err != nil {
		return CoupleView{}, users.User{}, users.User{}, err
	}

	target, err := s.users.GetByID(ctx, *req.TargetUserID)
	if err != nil {
		return CoupleView{}, users.User{}, users.User{}, err
	}

	partnerID := requester.ID
	if partnerID == currentUserID {
		partnerID = target.ID
	}

	view := CoupleView{
		Couple:    couple,
		PartnerID: partnerID,
	}

	return view, requester, target, nil
}

// GetStatus returns the couple and pending requests for a user.
func (s Service) GetStatus(ctx context.Context, userID uuid.UUID) (StatusView, error) {
	status := StatusView{}

	if couple, err := s.store.GetCoupleByUserID(ctx, userID); err == nil {
		partnerID := couple.Partner1UserID
		if partnerID == userID {
			partnerID = couple.Partner2UserID
		}
		status.Couple = &CoupleView{Couple: couple, PartnerID: partnerID}
	} else if !errors.Is(err, ErrNotFound) {
		return StatusView{}, err
	}

	requests, err := s.store.ListPendingRequestsForUser(ctx, userID)
	if err != nil {
		return StatusView{}, err
	}

	for _, req := range requests {
		view := RequestView{Request: req, PartnerID: req.RequesterUserID, Direction: DirectionIncoming}
		if req.RequesterUserID == userID {
			view.Direction = DirectionOutgoing
			if req.TargetUserID != nil {
				view.PartnerID = *req.TargetUserID
			} else {
				// For requests to non-existent users, use a dummy ID
				view.PartnerID = uuid.New()
			}
			status.Outgoing = append(status.Outgoing, view)
		} else {
			view.PartnerID = req.RequesterUserID
			status.Incoming = append(status.Incoming, view)
		}
	}

	return status, nil
}

// UpdateRequestTargetUser updates the target_user_id of a pending request.
func (s Service) UpdateRequestTargetUser(ctx context.Context, requestID uuid.UUID, targetUserID uuid.UUID) error {
	return s.store.UpdateRequestTargetUser(ctx, requestID, targetUserID)
}

// ResendCouple resends an invitation email for a pending outgoing request.
func (s Service) ResendCouple(ctx context.Context, requestID uuid.UUID, currentUserID uuid.UUID) error {
	req, err := s.store.GetRequestByID(ctx, requestID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return ErrRequestNotFound
		}
		return err
	}

	if req.Status != StatusPending {
		return ErrRequestNotPending
	}

	if req.RequesterUserID != currentUserID {
		return ErrRequestNotAuthorized
	}

	if req.InvitationToken == nil {
		return errors.New("no invitation token available")
	}

	// Get the email to send to
	var email string
	if req.TargetUserID != nil {
		target, err := s.users.GetByID(ctx, *req.TargetUserID)
		if err != nil {
			return err
		}
		email = target.Email
	} else if req.TargetEmail != nil {
		email = *req.TargetEmail
	} else {
		return errors.New("no email available for resend")
	}

	// Get requester name
	requester, err := s.users.GetByID(ctx, req.RequesterUserID)
	if err != nil {
		return err
	}

	// Send invitation email if email service is available
	if s.emailSender != nil {
		go func() {
			err := s.emailSender.SendInvitation(email, requester.Name, *req.InvitationToken)
			if err != nil {
				// Log the error (you might want to use a proper logger)
				fmt.Printf("Failed to resend invitation email to %s: %v\n", email, err)
			} else {
				fmt.Printf("Invitation email resent to %s\n", email)
			}
		}()
	}

	return nil
}

// GetRequestByInvitationToken retrieves a couple request by its invitation token.
func (s Service) GetRequestByInvitationToken(ctx context.Context, token string) (CoupleRequest, error) {
	return s.store.GetRequestByInvitationToken(ctx, token)
}
