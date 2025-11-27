package piggybanks

import (
	"time"

	"github.com/google/uuid"
)

type PiggyBank struct {
	ID          uuid.UUID
	CoupleID    uuid.UUID
	Title       string
	Description *string
	StartDate   time.Time
	EndDate     *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type PiggyBankView struct {
	PiggyBank            PiggyBank
	VoucherTemplatesCount int
	TotalActions          int
	TotalValue            int
}
