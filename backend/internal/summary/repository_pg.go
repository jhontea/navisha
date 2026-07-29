package summary

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

var _ Repository = (*postgresRepository)(nil)

func (r *postgresRepository) Save(ctx context.Context, tripID, content, model string, sourceUpdatedAt time.Time) (*Summary, error) {
	s := &Summary{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO trip_summaries (trip_id, content, model, source_updated_at)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (trip_id) DO UPDATE
		   SET content = EXCLUDED.content,
		       model = EXCLUDED.model,
		       source_updated_at = EXCLUDED.source_updated_at,
		       updated_at = NOW()
		 RETURNING id, trip_id, content, model, source_updated_at, false, created_at, updated_at`,
		tripID, content, model, sourceUpdatedAt).
		Scan(&s.ID, &s.TripID, &s.Content, &s.Model, &s.SourceUpdatedAt, &s.IsOutdated, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("summary.Save: %w", err)
	}
	return s, nil
}

func (r *postgresRepository) GetByTripID(ctx context.Context, tripID string) (*Summary, error) {
	s := &Summary{}
	err := r.db.QueryRow(ctx,
		`SELECT s.id, s.trip_id, s.content, s.model, s.source_updated_at,
		        (t.updated_at > s.source_updated_at) AS is_outdated,
		        s.created_at, s.updated_at
		 FROM trip_summaries s
		 JOIN trips t ON t.id = s.trip_id
		 WHERE s.trip_id = $1`, tripID).
		Scan(&s.ID, &s.TripID, &s.Content, &s.Model, &s.SourceUpdatedAt, &s.IsOutdated, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("summary.GetByTripID: %w", err)
	}
	return s, nil
}

func (r *postgresRepository) Delete(ctx context.Context, tripID string) error {
	_, err := r.db.Exec(ctx,
		`DELETE FROM trip_summaries WHERE trip_id = $1`, tripID)
	if err != nil {
		return fmt.Errorf("summary.Delete: %w", err)
	}
	return nil
}

func (r *postgresRepository) VerifyTripOwner(ctx context.Context, userID, tripID string) error {
	var ownerID string
	err := r.db.QueryRow(ctx,
		`SELECT user_id FROM trips WHERE id = $1`, tripID).Scan(&ownerID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrForbidden
		}
		return fmt.Errorf("summary.VerifyTripOwner: %w", err)
	}
	if ownerID != userID {
		return ErrForbidden
	}
	return nil
}
