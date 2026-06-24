package user

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	gooauth2 "golang.org/x/oauth2"
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

func (r *postgresRepository) UpdateGoogleTokens(userID string, token *gooauth2.Token, scopes []string) error {
	var expiry *time.Time
	if !token.Expiry.IsZero() {
		e := token.Expiry
		expiry = &e
	}

	tag, err := r.db.Exec(context.Background(),
		`UPDATE users
		    SET google_refresh_token = COALESCE(NULLIF($2, ''), google_refresh_token),
		        google_access_token  = $3,
		        google_token_expiry  = $4,
		        google_scopes        = $5,
		        updated_at           = NOW()
		  WHERE id = $1`,
		userID, token.RefreshToken, token.AccessToken, expiry, scopes)
	if err != nil {
		return fmt.Errorf("user.UpdateGoogleTokens: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *postgresRepository) GetGoogleToken(userID string) (*gooauth2.Token, []string, error) {
	var (
		refresh string
		access  string
		expiry  *time.Time
		scopes  []string
	)
	err := r.db.QueryRow(context.Background(),
		`SELECT COALESCE(google_refresh_token, ''),
		        COALESCE(google_access_token, ''),
		        google_token_expiry,
		        google_scopes
		   FROM users WHERE id = $1`, userID).
		Scan(&refresh, &access, &expiry, &scopes)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil, ErrNotFound
		}
		return nil, nil, fmt.Errorf("user.GetGoogleToken: %w", err)
	}

	tok := &gooauth2.Token{
		AccessToken:  access,
		RefreshToken: refresh,
	}
	if expiry != nil {
		tok.Expiry = *expiry
	}
	return tok, scopes, nil
}
