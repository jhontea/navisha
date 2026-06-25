package user

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type postgresRepository struct {
	db *pgxpool.Pool
}

func NewPostgresRepository(db *pgxpool.Pool) Repository {
	return &postgresRepository{db: db}
}

func (r *postgresRepository) FindByID(id string) (*User, error) {
	u := &User{}
	err := r.db.QueryRow(context.Background(),
		`SELECT id, google_id, email, name, avatar_url, created_at, updated_at
		 FROM users WHERE id = $1`, id).
		Scan(&u.ID, &u.GoogleID, &u.Email, &u.Name, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("user.FindByID: %w", err)
	}
	return u, nil
}

func (r *postgresRepository) FindByGoogleID(googleID string) (*User, error) {
	u := &User{}
	err := r.db.QueryRow(context.Background(),
		`SELECT id, google_id, email, name, avatar_url, created_at, updated_at
		 FROM users WHERE google_id = $1`, googleID).
		Scan(&u.ID, &u.GoogleID, &u.Email, &u.Name, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("user.FindByGoogleID: %w", err)
	}
	return u, nil
}

func (r *postgresRepository) Upsert(u *User) (*User, error) {
	out := &User{}
	err := r.db.QueryRow(context.Background(),
		`INSERT INTO users (google_id, email, name, avatar_url)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (google_id) DO UPDATE
		   SET email      = EXCLUDED.email,
		       name       = EXCLUDED.name,
		       avatar_url = EXCLUDED.avatar_url,
		       updated_at = NOW()
		 RETURNING id, google_id, email, name, avatar_url, created_at, updated_at`,
		u.GoogleID, u.Email, u.Name, u.AvatarURL).
		Scan(&out.ID, &out.GoogleID, &out.Email, &out.Name, &out.AvatarURL, &out.CreatedAt, &out.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("user.Upsert: %w", err)
	}
	return out, nil
}
