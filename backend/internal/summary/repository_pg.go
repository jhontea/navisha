package summary

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

var _ Repository = (*postgresRepository)(nil)

func (r *postgresRepository) Save(tripID, content, model string) (*Summary, error) {
	s := &Summary{}
	err := r.db.QueryRow(context.Background(),
		`INSERT INTO trip_summaries (trip_id, content, model)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (trip_id) DO UPDATE
		   SET content = EXCLUDED.content,
		       model = EXCLUDED.model,
		       updated_at = NOW()
		 RETURNING id, trip_id, content, model, created_at, updated_at`,
		tripID, content, model).
		Scan(&s.ID, &s.TripID, &s.Content, &s.Model, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("summary.Save: %w", err)
	}
	return s, nil
}

func (r *postgresRepository) GetByTripID(tripID string) (*Summary, error) {
	s := &Summary{}
	err := r.db.QueryRow(context.Background(),
		`SELECT id, trip_id, content, model, created_at, updated_at
		 FROM trip_summaries WHERE trip_id = $1`, tripID).
		Scan(&s.ID, &s.TripID, &s.Content, &s.Model, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("summary.GetByTripID: %w", err)
	}
	return s, nil
}

func (r *postgresRepository) Delete(tripID string) error {
	_, err := r.db.Exec(context.Background(),
		`DELETE FROM trip_summaries WHERE trip_id = $1`, tripID)
	if err != nil {
		return fmt.Errorf("summary.Delete: %w", err)
	}
	return nil
}
