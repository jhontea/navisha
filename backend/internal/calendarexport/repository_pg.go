package calendarexport

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type postgresRepository struct {
	db *pgxpool.Pool
}

func NewPostgresRepository(db *pgxpool.Pool) Repository {
	return &postgresRepository{db: db}
}

func (r *postgresRepository) Insert(e *Export) error {
	calendarID := e.GoogleCalendarID
	if calendarID == "" {
		calendarID = "primary"
	}
	_, err := r.db.Exec(context.Background(),
		`INSERT INTO calendar_exports
		   (user_id, trip_id, source_type, source_id, google_event_id, google_calendar_id)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 ON CONFLICT (source_type, source_id) DO NOTHING`,
		e.UserID, e.TripID, e.SourceType, e.SourceID, e.GoogleEventID, calendarID)
	if err != nil {
		return fmt.Errorf("calendarexport.Insert: %w", err)
	}
	return nil
}

func (r *postgresRepository) ListByTrip(tripID string) ([]Export, error) {
	rows, err := r.db.Query(context.Background(),
		`SELECT id, user_id, trip_id, source_type, source_id, google_event_id, google_calendar_id, created_at
		   FROM calendar_exports WHERE trip_id = $1`, tripID)
	if err != nil {
		return nil, fmt.Errorf("calendarexport.ListByTrip: %w", err)
	}
	defer rows.Close()

	var out []Export
	for rows.Next() {
		var e Export
		if err := rows.Scan(&e.ID, &e.UserID, &e.TripID, &e.SourceType, &e.SourceID,
			&e.GoogleEventID, &e.GoogleCalendarID, &e.CreatedAt); err != nil {
			return nil, fmt.Errorf("calendarexport.ListByTrip scan: %w", err)
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (r *postgresRepository) DeleteByTrip(tripID string) error {
	_, err := r.db.Exec(context.Background(),
		`DELETE FROM calendar_exports WHERE trip_id = $1`, tripID)
	if err != nil {
		return fmt.Errorf("calendarexport.DeleteByTrip: %w", err)
	}
	return nil
}

func (r *postgresRepository) DeleteByID(id string) error {
	_, err := r.db.Exec(context.Background(),
		`DELETE FROM calendar_exports WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("calendarexport.DeleteByID: %w", err)
	}
	return nil
}

func (r *postgresRepository) CountByTrip(tripID string) (int, error) {
	var n int
	err := r.db.QueryRow(context.Background(),
		`SELECT COUNT(*) FROM calendar_exports WHERE trip_id = $1`, tripID).Scan(&n)
	if err != nil {
		return 0, fmt.Errorf("calendarexport.CountByTrip: %w", err)
	}
	return n, nil
}

func (r *postgresRepository) ExistsBySource(sourceType, sourceID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(context.Background(),
		`SELECT EXISTS (SELECT 1 FROM calendar_exports WHERE source_type = $1 AND source_id = $2)`,
		sourceType, sourceID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("calendarexport.ExistsBySource: %w", err)
	}
	return exists, nil
}
