package transportation

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
		return nil, fmt.Errorf("transportation.BeginTx: %w", err)
	}
	return tx, nil
}

func (r *postgresRepository) Commit(ctx context.Context, tx pgx.Tx) error {
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("transportation.Commit: %w", err)
	}
	return nil
}

func (r *postgresRepository) Rollback(ctx context.Context, tx pgx.Tx) error {
	if err := tx.Rollback(ctx); err != nil && !errors.Is(err, pgx.ErrTxClosed) {
		return fmt.Errorf("transportation.Rollback: %w", err)
	}
	return nil
}

// InsertTx mirrors Insert but runs against a caller-owned transaction so
// the usecase can chain a linked expense insert atomically.
func (r *postgresRepository) InsertTx(ctx context.Context, tx pgx.Tx, t *Transportation) (*Transportation, error) {
	row := tx.QueryRow(ctx,
		`INSERT INTO transportations (trip_id, type, label, operator, reference_number,
		                              from_location, to_location, departure_datetime,
		                              arrival_datetime, notes)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 RETURNING id, trip_id, type, label, operator, reference_number,
		           from_location, to_location, departure_datetime, arrival_datetime,
		           notes, created_at, updated_at`,
		t.TripID, string(t.Type), t.Label, t.Operator, t.ReferenceNumber,
		t.FromLocation, t.ToLocation, t.DepartureDatetime, t.ArrivalDatetime,
		t.Notes)
	out, err := scan(row)
	if err != nil {
		return nil, fmt.Errorf("transportation.InsertTx: %w", err)
	}
	return out, nil
}

func (r *postgresRepository) FindTripOwner(tripID string) (string, error) {
	var userID string
	err := r.db.QueryRow(context.Background(),
		`SELECT user_id FROM trips WHERE id = $1`, tripID).Scan(&userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrTripNotFound
		}
		return "", fmt.Errorf("transportation.FindTripOwner: %w", err)
	}
	return userID, nil
}

func (r *postgresRepository) FindTransportationOwner(id string) (string, string, error) {
	var userID, tripID string
	err := r.db.QueryRow(context.Background(),
		`SELECT t.user_id, x.trip_id
		 FROM transportations x
		 JOIN trips t ON t.id = x.trip_id
		 WHERE x.id = $1`, id).Scan(&userID, &tripID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", "", ErrNotFound
		}
		return "", "", fmt.Errorf("transportation.FindTransportationOwner: %w", err)
	}
	return userID, tripID, nil
}

func (r *postgresRepository) List(tripID string) ([]Transportation, error) {
	rows, err := r.db.Query(context.Background(),
		`SELECT id, trip_id, type, label, operator, reference_number,
		        from_location, to_location, departure_datetime, arrival_datetime,
		        notes, created_at, updated_at
		 FROM transportations
		 WHERE trip_id = $1
		 ORDER BY COALESCE(departure_datetime, created_at) ASC`, tripID)
	if err != nil {
		return nil, fmt.Errorf("transportation.List: %w", err)
	}
	defer rows.Close()

	out := []Transportation{}
	for rows.Next() {
		t, err := scan(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *t)
	}
	return out, nil
}

func (r *postgresRepository) FindByID(id string) (*Transportation, error) {
	row := r.db.QueryRow(context.Background(),
		`SELECT id, trip_id, type, label, operator, reference_number,
		        from_location, to_location, departure_datetime, arrival_datetime,
		        notes, created_at, updated_at
		 FROM transportations WHERE id = $1`, id)
	t, err := scan(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return t, nil
}

func (r *postgresRepository) Insert(t *Transportation) (*Transportation, error) {
	row := r.db.QueryRow(context.Background(),
		`INSERT INTO transportations (trip_id, type, label, operator, reference_number,
		                              from_location, to_location, departure_datetime,
		                              arrival_datetime, notes)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 RETURNING id, trip_id, type, label, operator, reference_number,
		           from_location, to_location, departure_datetime, arrival_datetime,
		           notes, created_at, updated_at`,
		t.TripID, string(t.Type), t.Label, t.Operator, t.ReferenceNumber,
		t.FromLocation, t.ToLocation, t.DepartureDatetime, t.ArrivalDatetime,
		t.Notes)
	out, err := scan(row)
	if err != nil {
		return nil, fmt.Errorf("transportation.Insert: %w", err)
	}
	return out, nil
}

func (r *postgresRepository) Update(t *Transportation) (*Transportation, error) {
	row := r.db.QueryRow(context.Background(),
		`UPDATE transportations
		    SET type = $2, label = $3, operator = $4, reference_number = $5,
		        from_location = $6, to_location = $7, departure_datetime = $8,
		        arrival_datetime = $9, notes = $10, updated_at = NOW()
		  WHERE id = $1
		  RETURNING id, trip_id, type, label, operator, reference_number,
		            from_location, to_location, departure_datetime, arrival_datetime,
		            notes, created_at, updated_at`,
		t.ID, string(t.Type), t.Label, t.Operator, t.ReferenceNumber,
		t.FromLocation, t.ToLocation, t.DepartureDatetime, t.ArrivalDatetime,
		t.Notes)
	out, err := scan(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("transportation.Update: %w", err)
	}
	return out, nil
}

func (r *postgresRepository) Delete(id string) error {
	cmd, err := r.db.Exec(context.Background(),
		`DELETE FROM transportations WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("transportation.Delete: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

type row interface {
	Scan(dest ...any) error
}

func scan(r row) (*Transportation, error) {
	t := &Transportation{}
	var typ string
	err := r.Scan(
		&t.ID, &t.TripID, &typ, &t.Label, &t.Operator, &t.ReferenceNumber,
		&t.FromLocation, &t.ToLocation, &t.DepartureDatetime, &t.ArrivalDatetime,
		&t.Notes, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	t.Type = Type(typ)
	return t, nil
}
