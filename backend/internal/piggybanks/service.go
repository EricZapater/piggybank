package piggybanks

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/piggybank/backend/internal/couples"
)

var (
	ErrNotAuthorized = errors.New("not authorized to access this piggybank")
)

type Service struct {
	store   Store
	couples couples.Store
}

func NewService(store Store, couplesStore couples.Store) Service {
	return Service{store: store, couples: couplesStore}
}

func (s Service) Create(ctx context.Context, userID uuid.UUID, title string, description *string, startDate time.Time, endDate *time.Time) (PiggyBank, error) {
	couple, err := s.couples.GetCoupleByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, couples.ErrNotFound) {
			return PiggyBank{}, ErrNotAuthorized
		}
		return PiggyBank{}, err
	}

	now := time.Now().UTC()
	pb := PiggyBank{
		ID:          uuid.New(),
		CoupleID:    couple.ID,
		Title:       title,
		Description: description,
		StartDate:   startDate,
		EndDate:     endDate,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.store.Create(ctx, pb); err != nil {
		return PiggyBank{}, err
	}

	return pb, nil
}

func (s Service) ListByUser(ctx context.Context, userID uuid.UUID) ([]PiggyBankView, error) {
	return s.store.ListByUserID(ctx, userID)
}

func (s Service) GetByID(ctx context.Context, id uuid.UUID, userID uuid.UUID) (PiggyBank, error) {
	return s.store.GetByIDForUser(ctx, id, userID)
}

func (s Service) Close(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	pb, err := s.store.GetByIDForUser(ctx, id, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return ErrNotAuthorized // Or ErrNotFound, but keeping consistent with GetByID
		}
		return err
	}

	now := time.Now().UTC()
	pb.EndDate = &now
	pb.UpdatedAt = now

	return s.store.Update(ctx, pb)
}
