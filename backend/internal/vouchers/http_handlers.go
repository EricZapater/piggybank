package vouchers

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/piggybank/backend/internal/auth"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) Handler {
	return Handler{service: service}
}

type createVoucherTemplatePayload struct {
	PiggyBankID uuid.UUID `json:"piggyBankId"`
	Title       string    `json:"title"`
	Description *string   `json:"description"`
	AmountCents int       `json:"amountCents"`
}

type voucherTemplateResponse struct {
	ID          string  `json:"id"`
	PiggyBankID string  `json:"piggyBankId"`
	Title       string  `json:"title"`
	Description *string `json:"description"`
	AmountCents int     `json:"amountCents"`
	CreatedAt   string  `json:"createdAt"`
}

func (h Handler) Create(c *gin.Context) {
	user, ok := auth.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
		return
	}

	var payload createVoucherTemplatePayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	if payload.AmountCents <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "amountCents must be positive"})
		return
	}

	vt, err := h.service.Create(c.Request.Context(), user.ID, payload.PiggyBankID, payload.Title, payload.Description, payload.AmountCents)
	if err != nil {
		switch {
		case errors.Is(err, ErrNotAuthorized):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		}
		return
	}

	resp := voucherTemplateResponse{
		ID:          vt.ID.String(),
		PiggyBankID: vt.PiggyBankID.String(),
		Title:       vt.Title,
		Description: vt.Description,
		AmountCents: vt.AmountCents,
		CreatedAt:   vt.CreatedAt.Format(time.RFC3339),
	}

	c.JSON(http.StatusCreated, resp)
}

func (h Handler) ListByPiggyBank(c *gin.Context) {
	user, ok := auth.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
		return
	}

	piggyBankIDStr := c.Param("id")
	piggyBankID, err := uuid.Parse(piggyBankIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid piggybank id"})
		return
	}

	voucherTemplates, err := h.service.ListByPiggyBank(c.Request.Context(), piggyBankID, user.ID)
	if err != nil {
		switch {
		case errors.Is(err, ErrNotAuthorized):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		}
		return
	}

	resp := make([]voucherTemplateResponse, 0, len(voucherTemplates))
	for _, vt := range voucherTemplates {
		resp = append(resp, voucherTemplateResponse{
			ID:          vt.ID.String(),
			PiggyBankID: vt.PiggyBankID.String(),
			Title:       vt.Title,
			Description: vt.Description,
			AmountCents: vt.AmountCents,
			CreatedAt:   vt.CreatedAt.Format(time.RFC3339),
		})
	}

	c.JSON(http.StatusOK, resp)
}
