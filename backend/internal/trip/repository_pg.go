package trip

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
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

func (r *postgresRepository) BeginTx(ctx context.Context) (pgx.Tx, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("trip.BeginTx: %w", err)
	}
	return tx, nil
}

func (r *postgresRepository) Commit(ctx context.Context, tx pgx.Tx) error {
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("trip.Commit: %w", err)
	}
	return nil
}

func (r *postgresRepository) Rollback(ctx context.Context, tx pgx.Tx) error {
	if err := tx.Rollback(ctx); err != nil && !errors.Is(err, pgx.ErrTxClosed) {
		return fmt.Errorf("trip.Rollback: %w", err)
	}
	return nil
}

// List returns trips for a user with cursor pagination.
// Order: start_date DESC, id DESC. Cursor encodes the last item from the previous page.
// Fetches limit+1 rows to detect whether a next page exists.
func (r *postgresRepository) List(userID, cursor string, limit int) (ListResult, error) {
	cursorDate, cursorID, hasCursor, err := decodeCursor(cursor)
	if err != nil {
		return ListResult{}, err
	}

	var (
		rows pgx.Rows
		qErr error
	)
	if hasCursor {
		rows, qErr = r.db.Query(context.Background(),
			`SELECT id, user_id, title, description, start_date, end_date,
			        base_currency, budget, cover_image_url, notes, created_at, updated_at
			 FROM trips
			 WHERE user_id = $1 AND (start_date, id) < ($2, $3)
			 ORDER BY start_date DESC, id DESC
			 LIMIT $4`,
			userID, cursorDate, cursorID, limit+1)
	} else {
		rows, qErr = r.db.Query(context.Background(),
			`SELECT id, user_id, title, description, start_date, end_date,
			        base_currency, budget, cover_image_url, notes, created_at, updated_at
			 FROM trips
			 WHERE user_id = $1
			 ORDER BY start_date DESC, id DESC
			 LIMIT $2`,
			userID, limit+1)
	}
	if qErr != nil {
		return ListResult{}, fmt.Errorf("trip.List: %w", qErr)
	}
	defer rows.Close()

	trips := []Trip{}
	for rows.Next() {
		var t Trip
		if err := rows.Scan(&t.ID, &t.UserID, &t.Title, &t.Description,
			&t.StartDate, &t.EndDate, &t.BaseCurrency, &t.Budget, &t.CoverImageURL,
			&t.Notes, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return ListResult{}, fmt.Errorf("trip.List scan: %w", err)
		}
		trips = append(trips, t)
	}

	out := ListResult{Trips: trips}
	if len(trips) > limit {
		last := trips[limit-1]
		out.Trips = trips[:limit]
		out.NextCursor = encodeCursor(last.StartDate, last.ID)
	}
	return out, nil
}

func (r *postgresRepository) ListFiltered(userID, cursor string, limit int, from, to string) (ListResult, error) {
	cursorDate, cursorID, hasCursor, err := decodeCursor(cursor)
	if err != nil {
		return ListResult{}, err
	}

	// Build optional date conditions
	var extraWhere string
	var args []any
	args = append(args, userID)
	if from != "" {
		args = append(args, from)
		extraWhere += fmt.Sprintf(" AND start_date >= $%d", len(args))
	}
	if to != "" {
		args = append(args, to)
		extraWhere += fmt.Sprintf(" AND end_date <= $%d", len(args))
	}

	var rows pgx.Rows
	var qErr error
	if hasCursor {
		args = append(args, cursorDate, cursorID, limit+1)
		rows, qErr = r.db.Query(context.Background(),
			fmt.Sprintf(
				`SELECT id, user_id, title, description, start_date, end_date,
				 base_currency, budget, cover_image_url, notes, created_at, updated_at
				 FROM trips
				 WHERE user_id = $1%s AND (start_date, id) < ($%d, $%d)
				 ORDER BY start_date DESC, id DESC
				 LIMIT $%d`,
				extraWhere, len(args)-2, len(args)-1, len(args),
			),
			args...)
	} else {
		args = append(args, limit+1)
		rows, qErr = r.db.Query(context.Background(),
			fmt.Sprintf(
				`SELECT id, user_id, title, description, start_date, end_date,
				 base_currency, budget, cover_image_url, notes, created_at, updated_at
				 FROM trips
				 WHERE user_id = $1%s
				 ORDER BY start_date DESC, id DESC
				 LIMIT $%d`,
				extraWhere, len(args),
			),
			args...)
	}
	if qErr != nil {
		return ListResult{}, fmt.Errorf("trip.ListFiltered: %w", qErr)
	}
	defer rows.Close()

	trips := []Trip{}
	for rows.Next() {
		var t Trip
		if err := rows.Scan(&t.ID, &t.UserID, &t.Title, &t.Description,
			&t.StartDate, &t.EndDate, &t.BaseCurrency, &t.Budget, &t.CoverImageURL,
			&t.Notes, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return ListResult{}, fmt.Errorf("trip.ListFiltered scan: %w", err)
		}
		trips = append(trips, t)
	}

	out := ListResult{Trips: trips}
	if len(trips) > limit {
		last := trips[limit-1]
		out.Trips = trips[:limit]
		out.NextCursor = encodeCursor(last.StartDate, last.ID)
	}
	return out, nil
}

func (r *postgresRepository) ListUpcoming(userID string, limit int) ([]Trip, error) {
	rows, err := r.db.Query(context.Background(),
		`SELECT id, user_id, title, description, start_date, end_date,
		        base_currency, budget, cover_image_url, notes, created_at, updated_at
		 FROM trips
		 WHERE user_id = $1 AND end_date >= CURRENT_DATE
		 ORDER BY start_date ASC
		 LIMIT $2`,
		userID, limit)
	if err != nil {
		return nil, fmt.Errorf("trip.ListUpcoming: %w", err)
	}
	defer rows.Close()

	trips := []Trip{}
	for rows.Next() {
		var t Trip
		if err := rows.Scan(&t.ID, &t.UserID, &t.Title, &t.Description,
			&t.StartDate, &t.EndDate, &t.BaseCurrency, &t.Budget, &t.CoverImageURL,
			&t.Notes, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, fmt.Errorf("trip.ListUpcoming scan: %w", err)
		}
		trips = append(trips, t)
	}
	return trips, nil
}

func (r *postgresRepository) FindByID(id string) (*Trip, error) {
	t := &Trip{}
	err := r.db.QueryRow(context.Background(),
		`SELECT id, user_id, title, description, start_date, end_date,
		        base_currency, budget, cover_image_url, notes, created_at, updated_at
		 FROM trips WHERE id = $1`, id).
		Scan(&t.ID, &t.UserID, &t.Title, &t.Description, &t.StartDate, &t.EndDate,
			&t.BaseCurrency, &t.Budget, &t.CoverImageURL, &t.Notes, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("trip.FindByID: %w", err)
	}
	return t, nil
}

func (r *postgresRepository) InsertTrip(ctx context.Context, tx pgx.Tx, t *Trip) (*Trip, error) {
	out := &Trip{}
	err := tx.QueryRow(ctx,
		`INSERT INTO trips (user_id, title, description, start_date, end_date,
		                    base_currency, budget, cover_image_url, notes)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING id, user_id, title, description, start_date, end_date,
		           base_currency, budget, cover_image_url, notes, created_at, updated_at`,
		t.UserID, t.Title, t.Description, t.StartDate, t.EndDate,
		t.BaseCurrency, t.Budget, t.CoverImageURL, t.Notes).
		Scan(&out.ID, &out.UserID, &out.Title, &out.Description, &out.StartDate, &out.EndDate,
			&out.BaseCurrency, &out.Budget, &out.CoverImageURL, &out.Notes, &out.CreatedAt, &out.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("trip.InsertTrip: %w", err)
	}
	return out, nil
}

// InsertDays inserts all days for a trip in a single multi-row INSERT.
// Phase 3D / Iter 9: batch insert via unnest instead of per-row loop.
func (r *postgresRepository) InsertDays(ctx context.Context, tx pgx.Tx, days []Day) error {
	if len(days) == 0 {
		return nil
	}
	tripIDs := make([]string, len(days))
	dates := make([]time.Time, len(days))
	dayNums := make([]int, len(days))
	notes := make([]string, len(days))
	for i, d := range days {
		tripIDs[i] = d.TripID
		dates[i] = d.Date
		dayNums[i] = d.DayNumber
		notes[i] = d.Notes
	}
	_, err := tx.Exec(ctx,
		`INSERT INTO days (trip_id, date, day_number, notes)
		 SELECT * FROM unnest($1::uuid[], $2::date[], $3::int[], $4::text[])`,
		tripIDs, dates, dayNums, notes)
	if err != nil {
		return fmt.Errorf("trip.InsertDays: %w", err)
	}
	return nil
}

// DeleteDays deletes all days for a trip within the provided transaction.
// Used when regenerating days after a date-range change.
func (r *postgresRepository) DeleteDays(ctx context.Context, tx pgx.Tx, tripID string) error {
	_, err := tx.Exec(ctx, `DELETE FROM days WHERE trip_id = $1`, tripID)
	if err != nil {
		return fmt.Errorf("trip.DeleteDays: %w", err)
	}
	return nil
}

func (r *postgresRepository) Update(t *Trip) (*Trip, error) {
	out := &Trip{}
	err := r.db.QueryRow(context.Background(),
		`UPDATE trips
		    SET title = $2, description = $3, start_date = $4, end_date = $5,
		        base_currency = $6, budget = $7, cover_image_url = $8, notes = $9, updated_at = NOW()
		  WHERE id = $1
		  RETURNING id, user_id, title, description, start_date, end_date,
		            base_currency, budget, cover_image_url, notes, created_at, updated_at`,
		t.ID, t.Title, t.Description, t.StartDate, t.EndDate,
		t.BaseCurrency, t.Budget, t.CoverImageURL, t.Notes).
		Scan(&out.ID, &out.UserID, &out.Title, &out.Description, &out.StartDate, &out.EndDate,
			&out.BaseCurrency, &out.Budget, &out.CoverImageURL, &out.Notes, &out.CreatedAt, &out.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("trip.Update: %w", err)
	}
	return out, nil
}

// UpdateTx updates a trip row within an existing transaction.
// Phase 3D / Iter 8: enables atomic trip+days updates.
func (r *postgresRepository) UpdateTx(ctx context.Context, tx pgx.Tx, t *Trip) (*Trip, error) {
	out := &Trip{}
	err := tx.QueryRow(ctx,
		`UPDATE trips
		    SET title = $2, description = $3, start_date = $4, end_date = $5,
		        base_currency = $6, budget = $7, cover_image_url = $8, notes = $9, updated_at = NOW()
		  WHERE id = $1
		  RETURNING id, user_id, title, description, start_date, end_date,
		            base_currency, budget, cover_image_url, notes, created_at, updated_at`,
		t.ID, t.Title, t.Description, t.StartDate, t.EndDate,
		t.BaseCurrency, t.Budget, t.CoverImageURL, t.Notes).
		Scan(&out.ID, &out.UserID, &out.Title, &out.Description, &out.StartDate, &out.EndDate,
			&out.BaseCurrency, &out.Budget, &out.CoverImageURL, &out.Notes, &out.CreatedAt, &out.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("trip.UpdateTx: %w", err)
	}
	return out, nil
}

func (r *postgresRepository) Delete(id string) error {
	cmd, err := r.db.Exec(context.Background(),
		`DELETE FROM trips WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("trip.Delete: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *postgresRepository) FindDayOwner(dayID string) (string, error) {
	var userID string
	err := r.db.QueryRow(context.Background(),
		`SELECT t.user_id
		 FROM days d
		 JOIN trips t ON t.id = d.trip_id
		 WHERE d.id = $1`, dayID).Scan(&userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrDayNotFound
		}
		return "", fmt.Errorf("trip.FindDayOwner: %w", err)
	}
	return userID, nil
}

func (r *postgresRepository) UpdateDayNotes(dayID, notes string) (*Day, error) {
	d := &Day{}
	err := r.db.QueryRow(context.Background(),
		`UPDATE days SET notes = $2 WHERE id = $1
		 RETURNING id, trip_id, date, day_number, notes`, dayID, notes).
		Scan(&d.ID, &d.TripID, &d.Date, &d.DayNumber, &d.Notes)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrDayNotFound
		}
		return nil, fmt.Errorf("trip.UpdateDayNotes: %w", err)
	}
	return d, nil
}

func (r *postgresRepository) ListDays(tripID string) ([]Day, error) {
	rows, err := r.db.Query(context.Background(),
		`SELECT id, trip_id, date, day_number, notes
		 FROM days WHERE trip_id = $1 ORDER BY day_number ASC`, tripID)
	if err != nil {
		return nil, fmt.Errorf("trip.ListDays: %w", err)
	}
	defer rows.Close()

	days := []Day{}
	for rows.Next() {
		var d Day
		if err := rows.Scan(&d.ID, &d.TripID, &d.Date, &d.DayNumber, &d.Notes); err != nil {
			return nil, fmt.Errorf("trip.ListDays scan: %w", err)
		}
		days = append(days, d)
	}
	return days, nil
}

// Cursor format: base64("<RFC3339 start_date>|<uuid id>"). Empty string = first page.

func encodeCursor(startDate time.Time, id string) string {
	raw := startDate.Format(time.RFC3339) + "|" + id
	return base64.URLEncoding.EncodeToString([]byte(raw))
}

func decodeCursor(cursor string) (time.Time, string, bool, error) {
	if cursor == "" {
		return time.Time{}, "", false, nil
	}
	raw, err := base64.URLEncoding.DecodeString(cursor)
	if err != nil {
		return time.Time{}, "", false, ErrInvalidCursor
	}
	parts := strings.SplitN(string(raw), "|", 2)
	if len(parts) != 2 {
		return time.Time{}, "", false, ErrInvalidCursor
	}
	t, err := time.Parse(time.RFC3339, parts[0])
	if err != nil {
		return time.Time{}, "", false, ErrInvalidCursor
	}
	return t, parts[1], true, nil
}
