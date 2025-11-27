package actions

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

type createActionEntryPayload struct {
	VoucherTemplateID string  `json:"voucherTemplateId"`
	OccurredAt        string  `json:"occurredAt"`
	Notes             *string `json:"notes"`
}

type actionEntryResponse struct {
	ID               string  `json:"id"`
	VoucherTemplateID string  `json:"voucherTemplateId"`
	GiverUserID      string  `json:"giverUserId"`
	OccurredAt       string  `json:"occurredAt"`
	Notes            *string `json:"notes"`
	CreatedAt        string  `json:"createdAt"`
}

type piggyBankStatsResponse struct {
	TotalActions int `json:"totalActions"`
	TotalValue   int `json:"totalValue"`
}

func (h Handler) Create(c *gin.Context) {
	user, ok := auth.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
		return
	}

	var payload createActionEntryPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	voucherTemplateID, err := uuid.Parse(payload.VoucherTemplateID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid voucherTemplateId"})
		return
	}

	occurredAt, err := time.Parse(time.RFC3339, payload.OccurredAt)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid occurredAt format"})
		return
	}

	ae, err := h.service.Create(c.Request.Context(), user.ID, voucherTemplateID, occurredAt, payload.Notes)
	if err != nil {
		switch {
		case errors.Is(err, ErrNotAuthorized):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		case errors.Is(err, ErrPiggyBankEnded):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			// Check if it's a "not found" error by checking the error message
			if err.Error() == "record not found" {
				c.JSON(http.StatusNotFound, gin.H{"error": "voucher template not found"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
			}
		}
		return
	}

	resp := actionEntryResponse{
		ID:               ae.ID.String(),
		VoucherTemplateID: ae.VoucherTemplateID.String(),
		GiverUserID:      ae.GiverUserID.String(),
		OccurredAt:       ae.OccurredAt.Format(time.RFC3339),
		Notes:            ae.Notes,
		CreatedAt:        ae.CreatedAt.Format(time.RFC3339),
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

	groups, err := h.service.ListByPiggyBank(c.Request.Context(), piggyBankID, user.ID)
	if err != nil {
		switch {
		case errors.Is(err, ErrNotAuthorized):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		}
		return
	}

	c.JSON(http.StatusOK, groups)
}

func (h Handler) GetStats(c *gin.Context) {
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

	stats, err := h.service.GetStatsByPiggyBank(c.Request.Context(), piggyBankID, user.ID)
	if err != nil {
		switch {
		case errors.Is(err, ErrNotAuthorized):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		}
		return
	}

	resp := piggyBankStatsResponse{
		TotalActions: stats.TotalActions,
		TotalValue:   stats.TotalValue,
	}

	c.JSON(http.StatusOK, resp)
}
