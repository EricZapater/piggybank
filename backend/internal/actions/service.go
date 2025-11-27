package actions

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/piggybank/backend/internal/piggybanks"
	"github.com/piggybank/backend/internal/vouchers"
)

var (
	ErrNotAuthorized = errors.New("not authorized to create action entries")
	ErrPiggyBankEnded = errors.New("cannot create action entries for ended piggybank")
)

type Service struct {
	store      Store
	piggybanks piggybanks.Store
	vouchers   vouchers.Store
}

func NewService(store Store, piggybanksStore piggybanks.Store, vouchersStore vouchers.Store) Service {
	return Service{
		store:      store,
		piggybanks: piggybanksStore,
		vouchers:   vouchersStore,
	}
}

func (s Service) Create(ctx context.Context, userID uuid.UUID, voucherTemplateID uuid.UUID, occurredAt time.Time, notes *string) (ActionEntry, error) {
	// Get the voucher template to find the piggybank
	vt, err := s.vouchers.GetByID(ctx, voucherTemplateID)
	if err != nil {
		if errors.Is(err, vouchers.ErrNotFound) {
			return ActionEntry{}, vouchers.ErrNotFound
		}
		return ActionEntry{}, err
	}

	// Check if user has access to the piggybank
	_, err = s.piggybanks.GetByIDForUser(ctx, vt.PiggyBankID, userID)
	if err != nil {
		if errors.Is(err, piggybanks.ErrNotFound) {
			return ActionEntry{}, ErrNotAuthorized
		}
		return ActionEntry{}, err
	}

	// Check if piggybank has ended
	pb, err := s.piggybanks.GetByID(ctx, vt.PiggyBankID)
	if err != nil {
		return ActionEntry{}, err
	}
	if pb.EndDate != nil && time.Now().After(*pb.EndDate) {
		return ActionEntry{}, ErrPiggyBankEnded
	}

	now := time.Now().UTC()
	ae := ActionEntry{
		ID:               uuid.New(),
		VoucherTemplateID: voucherTemplateID,
		GiverUserID:      userID,
		OccurredAt:       occurredAt,
		Notes:            notes,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	if err := s.store.Create(ctx, ae); err != nil {
		return ActionEntry{}, err
	}

	return ae, nil
}

func (s Service) ListByPiggyBank(ctx context.Context, piggyBankID uuid.UUID, userID uuid.UUID) ([]ActionEntryGroup, error) {
	// Check if user has access to the piggybank
	_, err := s.piggybanks.GetByIDForUser(ctx, piggyBankID, userID)
	if err != nil {
		if errors.Is(err, piggybanks.ErrNotFound) {
			return nil, ErrNotAuthorized
		}
		return nil, err
	}

	return s.store.ListByPiggyBankGrouped(ctx, piggyBankID)
}

func (s Service) GetStatsByPiggyBank(ctx context.Context, piggyBankID uuid.UUID, userID uuid.UUID) (PiggyBankStats, error) {
	// Check if user has access to the piggybank
	_, err := s.piggybanks.GetByIDForUser(ctx, piggyBankID, userID)
	if err != nil {
		if errors.Is(err, piggybanks.ErrNotFound) {
			return PiggyBankStats{}, ErrNotAuthorized
		}
		return PiggyBankStats{}, err
	}

	return s.store.GetStatsByPiggyBank(ctx, piggyBankID)
}
