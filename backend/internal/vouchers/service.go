package vouchers

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/piggybank/backend/internal/piggybanks"
)

var (
	ErrNotAuthorized = errors.New("not authorized to access this voucher template")
)

type Service struct {
	store      Store
	piggybanks piggybanks.Store
}

func NewService(store Store, piggybanksStore piggybanks.Store) Service {
	return Service{store: store, piggybanks: piggybanksStore}
}

func (s Service) Create(ctx context.Context, userID uuid.UUID, piggyBankID uuid.UUID, title string, description *string, amountCents int) (VoucherTemplate, error) {
	// Verify user has access to the piggybank
	_, err := s.piggybanks.GetByIDForUser(ctx, piggyBankID, userID)
	if err != nil {
		if errors.Is(err, piggybanks.ErrNotFound) {
			return VoucherTemplate{}, ErrNotAuthorized
		}
		return VoucherTemplate{}, err
	}

	now := time.Now().UTC()
	vt := VoucherTemplate{
		ID:          uuid.New(),
		PiggyBankID: piggyBankID,
		Title:       title,
		Description: description,
		AmountCents: amountCents,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.store.Create(ctx, vt); err != nil {
		return VoucherTemplate{}, err
	}

	return vt, nil
}

func (s Service) ListByPiggyBank(ctx context.Context, piggyBankID uuid.UUID, userID uuid.UUID) ([]VoucherTemplate, error) {
	// Verify user has access to the piggybank
	_, err := s.piggybanks.GetByIDForUser(ctx, piggyBankID, userID)
	if err != nil {
		if errors.Is(err, piggybanks.ErrNotFound) {
			return nil, ErrNotAuthorized
		}
		return nil, err
	}

	return s.store.ListByPiggyBankID(ctx, piggyBankID)
}
