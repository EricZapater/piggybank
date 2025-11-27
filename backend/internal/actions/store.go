package actions

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("record not found")

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) Store {
	return Store{pool: pool}
}

func (s Store) Create(ctx context.Context, ae ActionEntry) error {
	query := `
        INSERT INTO action_entries (id, voucher_template_id, giver_user_id, occurred_at, notes, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `
	_, err := s.pool.Exec(ctx, query, ae.ID, ae.VoucherTemplateID, ae.GiverUserID, ae.OccurredAt, ae.Notes, ae.CreatedAt, ae.UpdatedAt)
	return err
}

func (s Store) ListByPiggyBankGrouped(ctx context.Context, piggyBankID uuid.UUID) ([]ActionEntryGroup, error) {
	query := `
        SELECT
            ae.id, ae.occurred_at, ae.notes, ae.created_at,
            vt.id, vt.title, vt.description, vt.amount_cents
        FROM action_entries ae
        INNER JOIN voucher_templates vt ON ae.voucher_template_id = vt.id
        INNER JOIN piggybanks pb ON vt.piggybank_id = pb.id
        WHERE pb.id = $1
        ORDER BY vt.id, ae.occurred_at DESC
    `
	rows, err := s.pool.Query(ctx, query, piggyBankID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	groups := make(map[uuid.UUID]*ActionEntryGroup)
	for rows.Next() {
		var ae ActionEntrySummary
		var vtID uuid.UUID
		var vtTitle string
		var vtDescription *string
		var vtAmountCents int

		if err := rows.Scan(&ae.ID, &ae.OccurredAt, &ae.Notes, &ae.CreatedAt, &vtID, &vtTitle, &vtDescription, &vtAmountCents); err != nil {
			return nil, err
		}

		if groups[vtID] == nil {
			groups[vtID] = &ActionEntryGroup{
				VoucherTemplateID: vtID,
				Entries:           []ActionEntrySummary{},
			}
			groups[vtID].VoucherTemplate.ID = vtID
			groups[vtID].VoucherTemplate.Title = vtTitle
			groups[vtID].VoucherTemplate.Description = vtDescription
			groups[vtID].VoucherTemplate.AmountCents = vtAmountCents
		}

		groups[vtID].Entries = append(groups[vtID].Entries, ae)
	}

	result := make([]ActionEntryGroup, 0, len(groups))
	for _, group := range groups {
		result = append(result, *group)
	}

	return result, rows.Err()
}

func (s Store) GetStatsByPiggyBank(ctx context.Context, piggyBankID uuid.UUID) (PiggyBankStats, error) {
	query := `
        SELECT
            COUNT(ae.id) as total_actions,
            COALESCE(SUM(vt.amount_cents), 0) as total_value
        FROM action_entries ae
        INNER JOIN voucher_templates vt ON ae.voucher_template_id = vt.id
        INNER JOIN piggybanks pb ON vt.piggybank_id = pb.id
        WHERE pb.id = $1
    `
	var stats PiggyBankStats
	err := s.pool.QueryRow(ctx, query, piggyBankID).Scan(&stats.TotalActions, &stats.TotalValue)
	if err != nil {
		return PiggyBankStats{}, err
	}
	return stats, nil
}
