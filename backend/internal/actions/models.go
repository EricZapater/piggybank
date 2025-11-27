package actions

import (
	"time"

	"github.com/google/uuid"
)

type ActionEntry struct {
	ID               uuid.UUID
	VoucherTemplateID uuid.UUID
	GiverUserID      uuid.UUID
	OccurredAt       time.Time
	Notes            *string
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type ActionEntryGroup struct {
	VoucherTemplateID uuid.UUID `json:"voucherTemplateId"`
	VoucherTemplate   struct {
		ID          uuid.UUID `json:"id"`
		Title       string    `json:"title"`
		Description *string   `json:"description"`
		AmountCents int       `json:"amountCents"`
	} `json:"voucherTemplate"`
	Entries []ActionEntrySummary `json:"entries"`
}

type ActionEntrySummary struct {
	ID         uuid.UUID `json:"id"`
	OccurredAt time.Time `json:"occurredAt"`
	Notes      *string   `json:"notes"`
	CreatedAt  time.Time `json:"createdAt"`
}

type PiggyBankStats struct {
	TotalActions int `json:"totalActions"`
	TotalValue   int `json:"totalValue"` // in cents
}
