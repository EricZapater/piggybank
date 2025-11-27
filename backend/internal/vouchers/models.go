package vouchers

import (
	"time"

	"github.com/google/uuid"
)

type VoucherTemplate struct {
	ID           uuid.UUID
	PiggyBankID  uuid.UUID
	Title        string
	Description  *string
	AmountCents  int
	CreatedAt    time.Time
	UpdatedAt    time.Time
}
