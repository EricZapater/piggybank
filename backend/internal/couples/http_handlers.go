package couples

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/piggybank/backend/internal/auth"
	"github.com/piggybank/backend/internal/common/response"
	"github.com/piggybank/backend/internal/users"
)

// Handler exposes HTTP endpoints for couple workflows.
type Handler struct {
	service Service
}

// NewHandler constructs a handler instance.
func NewHandler(service Service) Handler {
	return Handler{service: service}
}

type requestCouplePayload struct {
	PartnerEmail string `json:"partnerEmail"`
}

type acceptCouplePayload struct {
	RequestID string `json:"requestId"`
}

type resendCouplePayload struct {
	RequestID string `json:"requestId"`
}

type coupleResponse struct {
	ID        string      `json:"id"`
	Partner   userSummary `json:"partner"`
	CreatedAt string      `json:"createdAt"`
}

type requestResponse struct {
	ID        string      `json:"id"`
	Direction string      `json:"direction"`
	Status    string      `json:"status"`
	Partner   userSummary `json:"partner"`
	CreatedAt string      `json:"createdAt"`
}

type statusResponse struct {
	Couple   *coupleResponse   `json:"couple,omitempty"`
	Incoming []requestResponse `json:"incoming"`
	Outgoing []requestResponse `json:"outgoing"`
}

type userSummary struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

// Request handles POST /couples/request.
func (h Handler) Request(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.UserFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "unauthenticated")
		return
	}

	var payload requestCouplePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		response.BadRequest(w, "invalid payload")
		return
	}

	view, partner, err := h.service.RequestCouple(r.Context(), user, payload.PartnerEmail)
	if err != nil {
		switch {
		case errors.Is(err, ErrPartnerRequired), errors.Is(err, ErrInvalidPartnerEmail), errors.Is(err, ErrCannotInviteSelf):
			response.BadRequest(w, err.Error())
		case errors.Is(err, ErrAlreadyCoupled), errors.Is(err, ErrPendingRequestExists):
			response.Conflict(w, err.Error())
		default:
			response.InternalError(w, err)
		}
		return
	}

	resp := requestResponse{
		ID:        view.Request.ID.String(),
		Direction: string(view.Direction),
		Status:    view.Request.Status,
		Partner:   mapUserSummary(partner),
		CreatedAt: view.Request.CreatedAt.Format(time.RFC3339),
	}

	response.JSON(w, http.StatusCreated, resp)
}

// Accept handles POST /couples/accept.
func (h Handler) Accept(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.UserFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "unauthenticated")
		return
	}

	var payload acceptCouplePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		response.BadRequest(w, "invalid payload")
		return
	}

	requestID, err := uuid.Parse(payload.RequestID)
	if err != nil {
		response.BadRequest(w, "invalid requestId")
		return
	}

	view, requester, target, err := h.service.AcceptCouple(r.Context(), requestID, user.ID)
	if err != nil {
		switch {
		case errors.Is(err, ErrRequestNotFound):
			response.NotFound(w, err.Error())
		case errors.Is(err, ErrRequestNotAuthorized):
			response.Forbidden(w, err.Error())
		case errors.Is(err, ErrAlreadyCoupled), errors.Is(err, ErrRequestNotPending):
			response.Conflict(w, err.Error())
		default:
			response.InternalError(w, err)
		}
		return
	}

	partner := requester
	if requester.ID == user.ID {
		partner = target
	}

	resp := coupleResponse{
		ID:        view.Couple.ID.String(),
		Partner:   mapUserSummary(partner),
		CreatedAt: view.Couple.CreatedAt.Format(time.RFC3339),
	}

	response.JSON(w, http.StatusOK, resp)
}

// Resend handles POST /couples/resend.
func (h Handler) Resend(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.UserFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "unauthenticated")
		return
	}

	var payload resendCouplePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		response.BadRequest(w, "invalid payload")
		return
	}

	requestID, err := uuid.Parse(payload.RequestID)
	if err != nil {
		response.BadRequest(w, "invalid requestId")
		return
	}

	err = h.service.ResendCouple(r.Context(), requestID, user.ID)
	if err != nil {
		switch {
		case errors.Is(err, ErrRequestNotFound):
			response.NotFound(w, err.Error())
		case errors.Is(err, ErrRequestNotAuthorized):
			response.Forbidden(w, err.Error())
		case errors.Is(err, ErrRequestNotPending):
			response.Conflict(w, err.Error())
		default:
			response.InternalError(w, err)
		}
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "invitation resent"})
}

// Status handles GET /couples/me.
func (h Handler) Status(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.UserFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "unauthenticated")
		return
	}

	status, err := h.service.GetStatus(r.Context(), user.ID)
	if err != nil {
		response.InternalError(w, err)
		return
	}

	resp := statusResponse{
		Incoming: make([]requestResponse, 0, len(status.Incoming)),
		Outgoing: make([]requestResponse, 0, len(status.Outgoing)),
	}

	if status.Couple != nil {
		partner, err := h.service.users.GetByID(r.Context(), status.Couple.PartnerID)
		if err != nil {
			if errors.Is(err, users.ErrNotFound) {
				response.InternalError(w, errors.New("partner profile missing"))
				return
			}
			response.InternalError(w, err)
			return
		}
		resp.Couple = &coupleResponse{
			ID:        status.Couple.Couple.ID.String(),
			Partner:   mapUserSummary(partner),
			CreatedAt: status.Couple.Couple.CreatedAt.Format(time.RFC3339),
		}
	}

	partnerCache := map[uuid.UUID]userSummary{}

	buildRequestResponse := func(view RequestView) (requestResponse, error) {
		summary, ok := partnerCache[view.PartnerID]
		if !ok {
			partner, err := h.service.users.GetByID(r.Context(), view.PartnerID)
			if err != nil {
				if errors.Is(err, users.ErrNotFound) {
					// For non-existent users, create a summary with email as name
					// We need to get the email from the request
					if view.Request.TargetEmail != nil {
						summary = userSummary{
							ID:    view.PartnerID.String(),
							Email: *view.Request.TargetEmail,
							Name:  *view.Request.TargetEmail,
						}
					} else {
						return requestResponse{}, errors.New("partner profile missing")
					}
				} else {
					return requestResponse{}, err
				}
			} else {
				summary = mapUserSummary(partner)
			}
			partnerCache[view.PartnerID] = summary
		}
		return requestResponse{
			ID:        view.Request.ID.String(),
			Direction: string(view.Direction),
			Status:    view.Request.Status,
			Partner:   summary,
			CreatedAt: view.Request.CreatedAt.Format(time.RFC3339),
		}, nil
	}

	for _, view := range status.Incoming {
		reqResp, err := buildRequestResponse(view)
		if err != nil {
			if errors.Is(err, users.ErrNotFound) {
				response.InternalError(w, errors.New("partner profile missing"))
				return
			}
			response.InternalError(w, err)
			return
		}
		resp.Incoming = append(resp.Incoming, reqResp)
	}

	for _, view := range status.Outgoing {
		reqResp, err := buildRequestResponse(view)
		if err != nil {
			if errors.Is(err, users.ErrNotFound) {
				response.InternalError(w, errors.New("partner profile missing"))
				return
			}
			response.InternalError(w, err)
			return
		}
		resp.Outgoing = append(resp.Outgoing, reqResp)
	}

	response.JSON(w, http.StatusOK, resp)
}

func mapUserSummary(user users.User) userSummary {
	return userSummary{
		ID:    user.ID.String(),
		Email: user.Email,
		Name:  user.Name,
	}
}
