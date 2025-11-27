package vouchers

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("record not found")

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) Store {
	return Store{pool: pool}
}

func (s Store) Create(ctx context.Context, vt VoucherTemplate) error {
	query := `
        INSERT INTO voucher_templates (id, piggybank_id, title, description, amount_cents, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `
	_, err := s.pool.Exec(ctx, query, vt.ID, vt.PiggyBankID, vt.Title, vt.Description, vt.AmountCents, vt.CreatedAt, vt.UpdatedAt)
	return err
}

func (s Store) ListByPiggyBankID(ctx context.Context, piggyBankID uuid.UUID) ([]VoucherTemplate, error) {
	query := `
        SELECT id, piggybank_id, title, description, amount_cents, created_at, updated_at
        FROM voucher_templates
        WHERE piggybank_id = $1
        ORDER BY created_at ASC
    `
	rows, err := s.pool.Query(ctx, query, piggyBankID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var voucherTemplates []VoucherTemplate
	for rows.Next() {
		var vt VoucherTemplate
		if err := rows.Scan(&vt.ID, &vt.PiggyBankID, &vt.Title, &vt.Description, &vt.AmountCents, &vt.CreatedAt, &vt.UpdatedAt); err != nil {
			return nil, err
		}
		voucherTemplates = append(voucherTemplates, vt)
	}
	return voucherTemplates, rows.Err()
}

func (s Store) GetByID(ctx context.Context, id uuid.UUID) (VoucherTemplate, error) {
	query := `
        SELECT id, piggybank_id, title, description, amount_cents, created_at, updated_at
        FROM voucher_templates
        WHERE id = $1
        LIMIT 1
    `
	row := s.pool.QueryRow(ctx, query, id)
	var vt VoucherTemplate
	if err := row.Scan(&vt.ID, &vt.PiggyBankID, &vt.Title, &vt.Description, &vt.AmountCents, &vt.CreatedAt, &vt.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return VoucherTemplate{}, ErrNotFound
		}
		return VoucherTemplate{}, err
	}
	return vt, nil
}
