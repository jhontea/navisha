package user

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type postgresRepository struct {
	db *pgxpool.Pool
}

func NewPostgresRepository(db *pgxpool.Pool) Repository {
	return &postgresRepository{db: db}
}

func (r *postgresRepository) FindByID(ctx context.Context, id string) (*User, error) {
	u := &User{}
	err := r.db.QueryRow(ctx,
		`SELECT id, google_id, email, name, avatar_url, email_verified, created_at, updated_at
		 FROM users WHERE id = $1`, id).
		Scan(&u.ID, &u.GoogleID, &u.Email, &u.Name, &u.AvatarURL, &u.EmailVerified, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("user.FindByID: %w", err)
	}
	return u, nil
}

func (r *postgresRepository) FindByGoogleID(ctx context.Context, googleID string) (*User, error) {
	u := &User{}
	err := r.db.QueryRow(ctx,
		`SELECT id, google_id, email, name, avatar_url, email_verified, created_at, updated_at
		 FROM users WHERE google_id = $1`, googleID).
		Scan(&u.ID, &u.GoogleID, &u.Email, &u.Name, &u.AvatarURL, &u.EmailVerified, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("user.FindByGoogleID: %w", err)
	}
	return u, nil
}

func (r *postgresRepository) Upsert(ctx context.Context, u *User) (*User, error) {
	out := &User{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO users (google_id, email, name, avatar_url, email_verified)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (google_id) DO UPDATE
		   SET email      = EXCLUDED.email,
		       name       = EXCLUDED.name,
		       avatar_url = EXCLUDED.avatar_url,
		       email_verified = EXCLUDED.email_verified,
		       updated_at = NOW()
		 RETURNING id, google_id, email, name, avatar_url, email_verified, created_at, updated_at`,
		u.GoogleID, u.Email, u.Name, u.AvatarURL, u.EmailVerified).
		Scan(&out.ID, &out.GoogleID, &out.Email, &out.Name, &out.AvatarURL, &out.EmailVerified, &out.CreatedAt, &out.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("user.Upsert: %w", err)
	}
	return out, nil
}

func (r *postgresRepository) CreateRefreshSession(ctx context.Context, id, userID string, tokenHash []byte, expiresAt time.Time) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO refresh_sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
		id, userID, tokenHash, expiresAt)
	if err != nil {
		return fmt.Errorf("user.CreateRefreshSession: %w", err)
	}
	return nil
}

func (r *postgresRepository) RotateRefreshSession(ctx context.Context, oldID, userID string, oldHash []byte, newID string, newHash []byte, newExpiresAt time.Time) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("user.RotateRefreshSession begin: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var storedUserID string
	err = tx.QueryRow(ctx,
		`SELECT user_id FROM refresh_sessions
		 WHERE id = $1 AND token_hash = $2 AND revoked_at IS NULL AND expires_at > NOW()
		 FOR UPDATE`, oldID, oldHash).Scan(&storedUserID)
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && storedUserID != userID) {
		return ErrInvalidSession
	}
	if err != nil {
		return fmt.Errorf("user.RotateRefreshSession lock: %w", err)
	}

	if _, err := tx.Exec(ctx,
		`INSERT INTO refresh_sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
		newID, userID, newHash, newExpiresAt); err != nil {
		return fmt.Errorf("user.RotateRefreshSession insert: %w", err)
	}
	if _, err := tx.Exec(ctx,
		`UPDATE refresh_sessions SET revoked_at = NOW(), replaced_by = $2 WHERE id = $1`,
		oldID, newID); err != nil {
		return fmt.Errorf("user.RotateRefreshSession revoke: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("user.RotateRefreshSession commit: %w", err)
	}
	return nil
}

func (r *postgresRepository) RevokeRefreshSession(ctx context.Context, id, userID string, tokenHash []byte) error {
	_, err := r.db.Exec(ctx,
		`UPDATE refresh_sessions SET revoked_at = COALESCE(revoked_at, NOW())
		 WHERE id = $1 AND user_id = $2 AND token_hash = $3`, id, userID, tokenHash)
	if err != nil {
		return fmt.Errorf("user.RevokeRefreshSession: %w", err)
	}
	return nil
}
