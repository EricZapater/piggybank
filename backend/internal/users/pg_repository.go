package users

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type pgRepository struct {
	pool *pgxpool.Pool
}

// NewPGRepository creates a new PostgreSQL-backed repository implementation.
func NewPGRepository(pool *pgxpool.Pool) Repository {
	return &pgRepository{pool: pool}
}

func (r *pgRepository) Create(ctx context.Context, user User) error {
	query := `
        INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
    `

	_, err := r.pool.Exec(ctx, query, user.ID, user.Email, user.PasswordHash, user.Name, user.CreatedAt, user.UpdatedAt)
	if err != nil {
		return err
	}
	return nil
}

func (r *pgRepository) GetByEmail(ctx context.Context, email string) (User, error) {
	query := `
        SELECT id, email, password_hash, name, created_at, updated_at
        FROM users
        WHERE email = $1
        LIMIT 1
    `

	row := r.pool.QueryRow(ctx, query, email)
	var user User
	if err := row.Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.CreatedAt, &user.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, ErrNotFound
		}
		return User{}, err
	}
	return user, nil
}

func (r *pgRepository) GetByID(ctx context.Context, id uuid.UUID) (User, error) {
	query := `
        SELECT id, email, password_hash, name, created_at, updated_at
        FROM users
        WHERE id = $1
        LIMIT 1
    `

	row := r.pool.QueryRow(ctx, query, id)
	var user User
	if err := row.Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.CreatedAt, &user.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, ErrNotFound
		}
		return User{}, err
	}
	return user, nil
}
