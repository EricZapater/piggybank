package piggybanks

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

type createPiggyBankPayload struct {
	Title       string  `json:"title"`
	Description *string `json:"description"`
	StartDate   string  `json:"startDate"`
	EndDate     *string `json:"endDate"`
}

type piggyBankResponse struct {
	ID                     string  `json:"id"`
	CoupleID               *string `json:"coupleId"`
	OwnerUserID            *string `json:"ownerUserId"`
	Title                  string  `json:"title"`
	Description            *string `json:"description"`
	StartDate              string  `json:"startDate"`
	EndDate                *string `json:"endDate"`
	CreatedAt              string  `json:"createdAt"`
	VoucherTemplatesCount  int     `json:"voucherTemplatesCount"`
	TotalActions           int     `json:"totalActions"`
	TotalValue             int     `json:"totalValue"`
}

func (h Handler) Create(c *gin.Context) {
	user, ok := auth.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
		return
	}

	var payload createPiggyBankPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	startDate, err := time.Parse(time.RFC3339, payload.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid startDate format"})
		return
	}

	var endDate *time.Time
	if payload.EndDate != nil {
		parsedEndDate, err := time.Parse(time.RFC3339, *payload.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid endDate format"})
			return
		}
		endDate = &parsedEndDate
	}

	pb, err := h.service.Create(c.Request.Context(), user.ID, payload.Title, payload.Description, startDate, endDate)
	if err != nil {
		switch {
		case errors.Is(err, ErrNotAuthorized):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		}
		return
	}

	resp := piggyBankResponse{
		ID:          pb.ID.String(),
		CoupleID:    formatUUIDPtr(pb.CoupleID),
		OwnerUserID: formatUUIDPtr(pb.OwnerUserID),
		Title:       pb.Title,
		Description: pb.Description,
		StartDate:   pb.StartDate.Format(time.RFC3339),
		EndDate:     formatTimePtr(pb.EndDate),
		CreatedAt:   pb.CreatedAt.Format(time.RFC3339),
	}

	c.JSON(http.StatusCreated, resp)
}

func (h Handler) List(c *gin.Context) {
	user, ok := auth.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
		return
	}

	piggyBanks, err := h.service.ListByUser(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	resp := make([]piggyBankResponse, 0, len(piggyBanks))
	for _, pbv := range piggyBanks {
		pb := pbv.PiggyBank
		resp = append(resp, piggyBankResponse{
			ID:                    pb.ID.String(),
			CoupleID:              formatUUIDPtr(pb.CoupleID),
			OwnerUserID:           formatUUIDPtr(pb.OwnerUserID),
			Title:                 pb.Title,
			Description:           pb.Description,
			StartDate:             pb.StartDate.Format(time.RFC3339),
			EndDate:               formatTimePtr(pb.EndDate),
			CreatedAt:             pb.CreatedAt.Format(time.RFC3339),
			VoucherTemplatesCount: pbv.VoucherTemplatesCount,
			TotalActions:          pbv.TotalActions,
			TotalValue:            pbv.TotalValue,
		})
	}

	c.JSON(http.StatusOK, resp)
}

func (h Handler) GetByID(c *gin.Context) {
	user, ok := auth.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
		return
	}

	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	pb, err := h.service.GetByID(c.Request.Context(), id, user.ID)
	if err != nil {
		switch {
		case errors.Is(err, ErrNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "piggybank not found"})
		case errors.Is(err, ErrNotAuthorized):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		}
		return
	}

	resp := piggyBankResponse{
		ID:          pb.ID.String(),
		CoupleID:    formatUUIDPtr(pb.CoupleID),
		OwnerUserID: formatUUIDPtr(pb.OwnerUserID),
		Title:       pb.Title,
		Description: pb.Description,
		StartDate:   pb.StartDate.Format(time.RFC3339),
		EndDate:     formatTimePtr(pb.EndDate),
		CreatedAt:   pb.CreatedAt.Format(time.RFC3339),
	}

	c.JSON(http.StatusOK, resp)
}

func formatTimePtr(t *time.Time) *string {
	if t == nil {
		return nil
	}
	formatted := t.Format(time.RFC3339)
	return &formatted
}

func formatUUIDPtr(u *uuid.UUID) *string {
	if u == nil {
		return nil
	}
	s := u.String()
	return &s
}

func (h Handler) Close(c *gin.Context) {
	user, ok := auth.UserFromContext(c.Request.Context())
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
		return
	}

	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.service.Close(c.Request.Context(), id, user.ID); err != nil {
		switch {
		case errors.Is(err, ErrNotAuthorized):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		case errors.Is(err, ErrNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "piggybank not found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		}
		return
	}

	c.Status(http.StatusNoContent)
}
