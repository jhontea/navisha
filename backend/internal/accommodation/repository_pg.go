package accommodation

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
		return nil, fmt.Errorf("accommodation.BeginTx: %w", err)
	}
	return tx, nil
}

func (r *postgresRepository) Commit(ctx context.Context, tx pgx.Tx) error {
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("accommodation.Commit: %w", err)
	}
	return nil
}

func (r *postgresRepository) Rollback(ctx context.Context, tx pgx.Tx) error {
	if err := tx.Rollback(ctx); err != nil && !errors.Is(err, pgx.ErrTxClosed) {
		return fmt.Errorf("accommodation.Rollback: %w", err)
	}
	return nil
}

func (r *postgresRepository) InsertTx(ctx context.Context, tx pgx.Tx, a *Accommodation) (*Accommodation, error) {
	row := tx.QueryRow(ctx,
		`INSERT INTO accommodations (trip_id, name, location_name, lat, lng, google_place_id,
		                             check_in, check_out, confirmation_number, notes)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 RETURNING id, trip_id, name, location_name, lat, lng, google_place_id,
		           check_in, check_out, confirmation_number, notes, created_at, updated_at`,
		a.TripID, a.Name, a.LocationName, a.Lat, a.Lng, a.GooglePlaceID,
		a.CheckIn, a.CheckOut, a.ConfirmationNumber, a.Notes)
	out, err := scan(row)
	if err != nil {
		return nil, fmt.Errorf("accommodation.InsertTx: %w", err)
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
		return "", fmt.Errorf("accommodation.FindTripOwner: %w", err)
	}
	return userID, nil
}

func (r *postgresRepository) FindAccommodationOwner(id string) (string, string, error) {
	var userID, tripID string
	err := r.db.QueryRow(context.Background(),
		`SELECT t.user_id, a.trip_id
		 FROM accommodations a
		 JOIN trips t ON t.id = a.trip_id
		 WHERE a.id = $1`, id).Scan(&userID, &tripID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", "", ErrNotFound
		}
		return "", "", fmt.Errorf("accommodation.FindAccommodationOwner: %w", err)
	}
	return userID, tripID, nil
}

func (r *postgresRepository) List(tripID string) ([]Accommodation, error) {
	rows, err := r.db.Query(context.Background(),
		`SELECT id, trip_id, name, location_name, lat, lng, google_place_id,
		        check_in, check_out, confirmation_number, notes, created_at, updated_at
		 FROM accommodations
		 WHERE trip_id = $1
		 ORDER BY check_in ASC`, tripID)
	if err != nil {
		return nil, fmt.Errorf("accommodation.List: %w", err)
	}
	defer rows.Close()

	out := []Accommodation{}
	for rows.Next() {
		a, err := scan(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *a)
	}
	return out, nil
}

func (r *postgresRepository) FindByID(id string) (*Accommodation, error) {
	row := r.db.QueryRow(context.Background(),
		`SELECT id, trip_id, name, location_name, lat, lng, google_place_id,
		        check_in, check_out, confirmation_number, notes, created_at, updated_at
		 FROM accommodations WHERE id = $1`, id)
	a, err := scan(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return a, nil
}

func (r *postgresRepository) Insert(a *Accommodation) (*Accommodation, error) {
	row := r.db.QueryRow(context.Background(),
		`INSERT INTO accommodations (trip_id, name, location_name, lat, lng, google_place_id,
		                             check_in, check_out, confirmation_number, notes)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 RETURNING id, trip_id, name, location_name, lat, lng, google_place_id,
		           check_in, check_out, confirmation_number, notes, created_at, updated_at`,
		a.TripID, a.Name, a.LocationName, a.Lat, a.Lng, a.GooglePlaceID,
		a.CheckIn, a.CheckOut, a.ConfirmationNumber, a.Notes)
	out, err := scan(row)
	if err != nil {
		return nil, fmt.Errorf("accommodation.Insert: %w", err)
	}
	return out, nil
}

func (r *postgresRepository) Update(a *Accommodation) (*Accommodation, error) {
	row := r.db.QueryRow(context.Background(),
		`UPDATE accommodations
		    SET name = $2, location_name = $3, lat = $4, lng = $5, google_place_id = $6,
		        check_in = $7, check_out = $8, confirmation_number = $9, notes = $10,
		        updated_at = NOW()
		  WHERE id = $1
		  RETURNING id, trip_id, name, location_name, lat, lng, google_place_id,
		            check_in, check_out, confirmation_number, notes, created_at, updated_at`,
		a.ID, a.Name, a.LocationName, a.Lat, a.Lng, a.GooglePlaceID,
		a.CheckIn, a.CheckOut, a.ConfirmationNumber, a.Notes)
	out, err := scan(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("accommodation.Update: %w", err)
	}
	return out, nil
}

func (r *postgresRepository) Delete(id string) error {
	cmd, err := r.db.Exec(context.Background(),
		`DELETE FROM accommodations WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("accommodation.Delete: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

type row interface {
	Scan(dest ...any) error
}

func scan(r row) (*Accommodation, error) {
	a := &Accommodation{}
	err := r.Scan(
		&a.ID, &a.TripID, &a.Name, &a.LocationName, &a.Lat, &a.Lng, &a.GooglePlaceID,
		&a.CheckIn, &a.CheckOut, &a.ConfirmationNumber, &a.Notes,
		&a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return a, nil
}
