package piggybanks

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

func (s Store) Create(ctx context.Context, pb PiggyBank) error {
	query := `
        INSERT INTO piggybanks (id, couple_id, title, description, start_date, end_date, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `
	_, err := s.pool.Exec(ctx, query, pb.ID, pb.CoupleID, pb.Title, pb.Description, pb.StartDate, pb.EndDate, pb.CreatedAt, pb.UpdatedAt)
	return err
}

func (s Store) Update(ctx context.Context, pb PiggyBank) error {
	query := `
        UPDATE piggybanks
        SET title = $2, description = $3, start_date = $4, end_date = $5, updated_at = $6
        WHERE id = $1
    `
	_, err := s.pool.Exec(ctx, query, pb.ID, pb.Title, pb.Description, pb.StartDate, pb.EndDate, pb.UpdatedAt)
	return err
}

func (s Store) ListByUserID(ctx context.Context, userID uuid.UUID) ([]PiggyBankView, error) {
	query := `
        SELECT
            pb.id, pb.couple_id, pb.title, pb.description, pb.start_date, pb.end_date, pb.created_at, pb.updated_at,
            COUNT(DISTINCT vt.id) as voucher_templates_count,
            COUNT(DISTINCT ae.id) as total_actions,
            COALESCE(SUM(vt_ae.amount_cents), 0) as total_value
        FROM piggybanks pb
        INNER JOIN couples c ON pb.couple_id = c.id
        LEFT JOIN voucher_templates vt ON pb.id = vt.piggybank_id
        LEFT JOIN voucher_templates vt_ae ON pb.id = vt_ae.piggybank_id
        LEFT JOIN action_entries ae ON vt_ae.id = ae.voucher_template_id
        WHERE (c.partner1_user_id = $1 OR c.partner2_user_id = $1) AND pb.end_date IS NULL
        GROUP BY pb.id, pb.couple_id, pb.title, pb.description, pb.start_date, pb.end_date, pb.created_at, pb.updated_at
        ORDER BY pb.created_at DESC
    `
	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var piggyBanks []PiggyBankView
	for rows.Next() {
		var pb PiggyBank
		var count int
		var totalActions int
		var totalValue int
		if err := rows.Scan(&pb.ID, &pb.CoupleID, &pb.Title, &pb.Description, &pb.StartDate, &pb.EndDate, &pb.CreatedAt, &pb.UpdatedAt, &count, &totalActions, &totalValue); err != nil {
			return nil, err
		}
		piggyBanks = append(piggyBanks, PiggyBankView{
			PiggyBank:             pb,
			VoucherTemplatesCount: count,
			TotalActions:          totalActions,
			TotalValue:            totalValue,
		})
	}
	return piggyBanks, rows.Err()
}

func (s Store) GetByID(ctx context.Context, id uuid.UUID) (PiggyBank, error) {
	query := `
        SELECT id, couple_id, title, description, start_date, end_date, created_at, updated_at
        FROM piggybanks
        WHERE id = $1
        LIMIT 1
    `
	row := s.pool.QueryRow(ctx, query, id)
	var pb PiggyBank
	if err := row.Scan(&pb.ID, &pb.CoupleID, &pb.Title, &pb.Description, &pb.StartDate, &pb.EndDate, &pb.CreatedAt, &pb.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return PiggyBank{}, ErrNotFound
		}
		return PiggyBank{}, err
	}
	return pb, nil
}

func (s Store) GetByIDForUser(ctx context.Context, id uuid.UUID, userID uuid.UUID) (PiggyBank, error) {
	query := `
        SELECT pb.id, pb.couple_id, pb.title, pb.description, pb.start_date, pb.end_date, pb.created_at, pb.updated_at
        FROM piggybanks pb
        INNER JOIN couples c ON pb.couple_id = c.id
        WHERE pb.id = $1 AND (c.partner1_user_id = $2 OR c.partner2_user_id = $2)
        LIMIT 1
    `
	row := s.pool.QueryRow(ctx, query, id, userID)
	var pb PiggyBank
	if err := row.Scan(&pb.ID, &pb.CoupleID, &pb.Title, &pb.Description, &pb.StartDate, &pb.EndDate, &pb.CreatedAt, &pb.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return PiggyBank{}, ErrNotFound
		}
		return PiggyBank{}, err
	}
	return pb, nil
}
