package couples

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("record not found")

// Store encapsulates database persistence for couples workflow.
type Store struct {
	pool *pgxpool.Pool
}

// NewStore creates a new couples store.
func NewStore(pool *pgxpool.Pool) Store {
	return Store{pool: pool}
}

func (s Store) CreateRequest(ctx context.Context, req CoupleRequest) error {
	query := `
        INSERT INTO couple_requests (id, requester_user_id, target_user_id, target_email, invitation_token, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `
	_, err := s.pool.Exec(ctx, query, req.ID, req.RequesterUserID, req.TargetUserID, req.TargetEmail, req.InvitationToken, req.Status, req.CreatedAt)
	return err
}

func (s Store) FindPendingRequestBetween(ctx context.Context, a, b uuid.UUID) (CoupleRequest, error) {
	query := `
        SELECT id, requester_user_id, target_user_id, target_email, invitation_token, status, created_at, responded_at
        FROM couple_requests
        WHERE status = 'pending'
          AND ((requester_user_id = $1 AND target_user_id = $2)
            OR (requester_user_id = $2 AND target_user_id = $1))
        LIMIT 1
    `
	row := s.pool.QueryRow(ctx, query, a, b)
	var req CoupleRequest
	if err := row.Scan(&req.ID, &req.RequesterUserID, &req.TargetUserID, &req.TargetEmail, &req.InvitationToken, &req.Status, &req.CreatedAt, &req.RespondedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return CoupleRequest{}, ErrNotFound
		}
		return CoupleRequest{}, err
	}
	return req, nil
}

func (s Store) ListPendingRequestsForUser(ctx context.Context, userID uuid.UUID) ([]CoupleRequest, error) {
	query := `
        SELECT id, requester_user_id, target_user_id, target_email, invitation_token, status, created_at, responded_at
        FROM couple_requests
        WHERE status = 'pending' AND (requester_user_id = $1 OR target_user_id = $1)
        ORDER BY created_at ASC
    `
	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []CoupleRequest
	for rows.Next() {
		var req CoupleRequest
		if err := rows.Scan(&req.ID, &req.RequesterUserID, &req.TargetUserID, &req.TargetEmail, &req.InvitationToken, &req.Status, &req.CreatedAt, &req.RespondedAt); err != nil {
			return nil, err
		}
		requests = append(requests, req)
	}
	return requests, rows.Err()
}

func (s Store) GetRequestByID(ctx context.Context, id uuid.UUID) (CoupleRequest, error) {
	query := `
        SELECT id, requester_user_id, target_user_id, target_email, invitation_token, status, created_at, responded_at
        FROM couple_requests
        WHERE id = $1
        LIMIT 1
    `
	row := s.pool.QueryRow(ctx, query, id)
	var req CoupleRequest
	if err := row.Scan(&req.ID, &req.RequesterUserID, &req.TargetUserID, &req.TargetEmail, &req.InvitationToken, &req.Status, &req.CreatedAt, &req.RespondedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return CoupleRequest{}, ErrNotFound
		}
		return CoupleRequest{}, err
	}
	return req, nil
}

func (s Store) UpdateRequestStatus(ctx context.Context, id uuid.UUID, status string, respondedAt time.Time) error {
	query := `
        UPDATE couple_requests
        SET status = $2, responded_at = $3
        WHERE id = $1
    `
	_, err := s.pool.Exec(ctx, query, id, status, respondedAt)
	return err
}

func (s Store) CreateCouple(ctx context.Context, c Couple) error {
	query := `
        INSERT INTO couples (id, partner1_user_id, partner2_user_id, created_at)
        VALUES ($1, $2, $3, $4)
    `
	_, err := s.pool.Exec(ctx, query, c.ID, c.Partner1UserID, c.Partner2UserID, c.CreatedAt)
	return err
}

func (s Store) GetCoupleByUserID(ctx context.Context, userID uuid.UUID) (Couple, error) {
	query := `
        SELECT id, partner1_user_id, partner2_user_id, created_at
        FROM couples
        WHERE partner1_user_id = $1 OR partner2_user_id = $1
        LIMIT 1
    `
	row := s.pool.QueryRow(ctx, query, userID)
	var couple Couple
	if err := row.Scan(&couple.ID, &couple.Partner1UserID, &couple.Partner2UserID, &couple.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Couple{}, ErrNotFound
		}
		return Couple{}, err
	}
	return couple, nil
}

func (s Store) GetRequestByInvitationToken(ctx context.Context, token string) (CoupleRequest, error) {
	query := `
        SELECT id, requester_user_id, target_user_id, target_email, invitation_token, status, created_at, responded_at
        FROM couple_requests
        WHERE invitation_token = $1
        LIMIT 1
    `
	row := s.pool.QueryRow(ctx, query, token)
	var req CoupleRequest
	if err := row.Scan(&req.ID, &req.RequesterUserID, &req.TargetUserID, &req.TargetEmail, &req.InvitationToken, &req.Status, &req.CreatedAt, &req.RespondedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return CoupleRequest{}, ErrNotFound
		}
		return CoupleRequest{}, err
	}
	return req, nil
}

func (s Store) UpdateRequestTargetUser(ctx context.Context, requestID uuid.UUID, targetUserID uuid.UUID) error {
	query := `
        UPDATE couple_requests
        SET target_user_id = $2, target_email = NULL
        WHERE id = $1 AND target_user_id IS NULL
    `
	tag, err := s.pool.Exec(ctx, query, requestID, targetUserID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() != 1 {
		return ErrNotFound
	}
	return nil
}

func (s Store) AcceptRequestWithCouple(ctx context.Context, requestID uuid.UUID, couple Couple, acceptedAt time.Time) error {
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	updateQuery := `
        UPDATE couple_requests
        SET status = $2, responded_at = $3
        WHERE id = $1 AND status = 'pending'
    `
	tag, err := tx.Exec(ctx, updateQuery, requestID, StatusAccepted, acceptedAt)
	if err != nil {
		return err
	}
	if tag.RowsAffected() != 1 {
		return ErrNotFound
	}

	insertQuery := `
        INSERT INTO couples (id, partner1_user_id, partner2_user_id, created_at)
        VALUES ($1, $2, $3, $4)
    `
	if _, err := tx.Exec(ctx, insertQuery, couple.ID, couple.Partner1UserID, couple.Partner2UserID, couple.CreatedAt); err != nil {
		return err
	}

	return tx.Commit(ctx)
}
