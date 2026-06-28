package activity

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

func (r *postgresRepository) BeginTx(ctx context.Context) (pgx.Tx, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("activity.BeginTx: %w", err)
	}
	return tx, nil
}

func (r *postgresRepository) Commit(ctx context.Context, tx pgx.Tx) error {
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("activity.Commit: %w", err)
	}
	return nil
}

func (r *postgresRepository) Rollback(ctx context.Context, tx pgx.Tx) error {
	if err := tx.Rollback(ctx); err != nil && !errors.Is(err, pgx.ErrTxClosed) {
		return fmt.Errorf("activity.Rollback: %w", err)
	}
	return nil
}

// FindDayOwner resolves the owning user_id of a day via the day → trip → user chain.
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
		return "", fmt.Errorf("activity.FindDayOwner: %w", err)
	}
	return userID, nil
}

// FindActivityOwner resolves (user_id, day_id) for an activity via JOIN.
func (r *postgresRepository) FindActivityOwner(activityID string) (string, string, error) {
	var userID, dayID string
	err := r.db.QueryRow(context.Background(),
		`SELECT t.user_id, a.day_id
		 FROM activities a
		 JOIN days d ON d.id = a.day_id
		 JOIN trips t ON t.id = d.trip_id
		 WHERE a.id = $1`, activityID).Scan(&userID, &dayID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", "", ErrNotFound
		}
		return "", "", fmt.Errorf("activity.FindActivityOwner: %w", err)
	}
	return userID, dayID, nil
}

func (r *postgresRepository) ListByDay(dayID string) ([]Activity, error) {
	rows, err := r.db.Query(context.Background(),
		`SELECT id, day_id, type, title, start_time, end_time, order_index, payload, created_at, updated_at
		 FROM activities
		 WHERE day_id = $1
		 ORDER BY order_index ASC, created_at ASC`, dayID)
	if err != nil {
		return nil, fmt.Errorf("activity.ListByDay: %w", err)
	}
	defer rows.Close()

	out := []Activity{}
	for rows.Next() {
		var a Activity
		var typ string
		if err := rows.Scan(&a.ID, &a.DayID, &typ, &a.Title, &a.StartTime, &a.EndTime,
			&a.OrderIndex, &a.Payload, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, fmt.Errorf("activity.ListByDay scan: %w", err)
		}
		a.Type = Type(typ)
		out = append(out, a)
	}
	return out, nil
}

func (r *postgresRepository) FindByID(id string) (*Activity, error) {
	a := &Activity{}
	var typ string
	err := r.db.QueryRow(context.Background(),
		`SELECT id, day_id, type, title, start_time, end_time, order_index, payload, created_at, updated_at
		 FROM activities WHERE id = $1`, id).
		Scan(&a.ID, &a.DayID, &typ, &a.Title, &a.StartTime, &a.EndTime,
			&a.OrderIndex, &a.Payload, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("activity.FindByID: %w", err)
	}
	a.Type = Type(typ)
	return a, nil
}

func (r *postgresRepository) Insert(a *Activity) (*Activity, error) {
	out := &Activity{}
	var typ string
	err := r.db.QueryRow(context.Background(),
		`INSERT INTO activities (day_id, type, title, start_time, end_time, order_index, payload)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, day_id, type, title, start_time, end_time, order_index, payload, created_at, updated_at`,
		a.DayID, string(a.Type), a.Title, a.StartTime, a.EndTime, a.OrderIndex, a.Payload).
		Scan(&out.ID, &out.DayID, &typ, &out.Title, &out.StartTime, &out.EndTime,
			&out.OrderIndex, &out.Payload, &out.CreatedAt, &out.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("activity.Insert: %w", err)
	}
	out.Type = Type(typ)
	return out, nil
}

func (r *postgresRepository) Update(a *Activity) (*Activity, error) {
	out := &Activity{}
	var typ string
	err := r.db.QueryRow(context.Background(),
		`UPDATE activities
		    SET title = $2, start_time = $3, end_time = $4, payload = $5, updated_at = NOW()
		  WHERE id = $1
		  RETURNING id, day_id, type, title, start_time, end_time, order_index, payload, created_at, updated_at`,
		a.ID, a.Title, a.StartTime, a.EndTime, a.Payload).
		Scan(&out.ID, &out.DayID, &typ, &out.Title, &out.StartTime, &out.EndTime,
			&out.OrderIndex, &out.Payload, &out.CreatedAt, &out.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("activity.Update: %w", err)
	}
	out.Type = Type(typ)
	return out, nil
}

func (r *postgresRepository) Delete(id string) error {
	cmd, err := r.db.Exec(context.Background(),
		`DELETE FROM activities WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("activity.Delete: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *postgresRepository) UpdateOrderTx(ctx context.Context, tx pgx.Tx, activityID string, orderIndex int) error {
	_, err := tx.Exec(ctx,
		`UPDATE activities SET order_index = $2, updated_at = NOW() WHERE id = $1`,
		activityID, orderIndex)
	if err != nil {
		return fmt.Errorf("activity.UpdateOrderTx: %w", err)
	}
	return nil
}

func (r *postgresRepository) ListIDsByDay(dayID string) ([]string, error) {
	rows, err := r.db.Query(context.Background(),
		`SELECT id FROM activities WHERE day_id = $1`, dayID)
	if err != nil {
		return nil, fmt.Errorf("activity.ListIDsByDay: %w", err)
	}
	defer rows.Close()

	out := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("activity.ListIDsByDay scan: %w", err)
		}
		out = append(out, id)
	}
	return out, nil
}

// ListByDayIDs fetches activities for multiple days in a single query.
// Returns a map of dayID → activities. Days with no activities get an empty slice.
// Phase 3D: Eliminates N+1 queries when loading trip context.
func (r *postgresRepository) ListByDayIDs(ctx context.Context, dayIDs []string) (map[string][]Activity, error) {
	if len(dayIDs) == 0 {
		return make(map[string][]Activity), nil
	}

	rows, err := r.db.Query(ctx,
		`SELECT id, day_id, type, title, start_time, end_time, order_index, payload, created_at, updated_at
		 FROM activities
		 WHERE day_id = ANY($1)
		 ORDER BY day_id, order_index ASC, created_at ASC`, dayIDs)
	if err != nil {
		return nil, fmt.Errorf("activity.ListByDayIDs: %w", err)
	}
	defer rows.Close()

	out := make(map[string][]Activity, len(dayIDs))
	// Pre-initialize all dayIDs so callers always get a slice (even empty).
	for _, did := range dayIDs {
		out[did] = []Activity{}
	}
	for rows.Next() {
		var a Activity
		var typ string
		if err := rows.Scan(&a.ID, &a.DayID, &typ, &a.Title, &a.StartTime, &a.EndTime,
			&a.OrderIndex, &a.Payload, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, fmt.Errorf("activity.ListByDayIDs scan: %w", err)
		}
		a.Type = Type(typ)
		out[a.DayID] = append(out[a.DayID], a)
	}
	return out, nil
}

// BatchUpdateOrderTx updates all order indexes in a single UPDATE statement
// using unnest with parallel arrays. Phase 3D: replaces N individual UPDATEs.
func (r *postgresRepository) BatchUpdateOrderTx(ctx context.Context, tx pgx.Tx, orderMap map[string]int) error {
	if len(orderMap) == 0 {
		return nil
	}
	for id, idx := range orderMap {
		_, err := tx.Exec(ctx,
			`UPDATE activities SET order_index = $1, updated_at = NOW() WHERE id = $2`,
			idx, id)
		if err != nil {
			return fmt.Errorf("activity.BatchUpdateOrderTx: %w", err)
		}
	}
	return nil
}
