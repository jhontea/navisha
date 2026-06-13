package expense

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

func (r *postgresRepository) FindTripOwner(tripID string) (string, string, error) {
	var userID, base string
	err := r.db.QueryRow(context.Background(),
		`SELECT user_id, base_currency FROM trips WHERE id = $1`, tripID).
		Scan(&userID, &base)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", "", ErrTripNotFound
		}
		return "", "", fmt.Errorf("expense.FindTripOwner: %w", err)
	}
	return userID, base, nil
}

func (r *postgresRepository) FindExpenseOwner(expenseID string) (string, string, error) {
	var userID, tripID string
	err := r.db.QueryRow(context.Background(),
		`SELECT t.user_id, e.trip_id
		 FROM expenses e
		 JOIN trips t ON t.id = e.trip_id
		 WHERE e.id = $1`, expenseID).Scan(&userID, &tripID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", "", ErrNotFound
		}
		return "", "", fmt.Errorf("expense.FindExpenseOwner: %w", err)
	}
	return userID, tripID, nil
}

func (r *postgresRepository) List(tripID string) ([]Expense, error) {
	rows, err := r.db.Query(context.Background(),
		`SELECT id, trip_id, activity_id, title, amount, currency,
		        converted_amount, base_currency, category, created_at, updated_at
		 FROM expenses
		 WHERE trip_id = $1
		 ORDER BY created_at DESC`, tripID)
	if err != nil {
		return nil, fmt.Errorf("expense.List: %w", err)
	}
	defer rows.Close()

	out := []Expense{}
	for rows.Next() {
		e, err := scan(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *e)
	}
	return out, nil
}

func (r *postgresRepository) FindByID(id string) (*Expense, error) {
	row := r.db.QueryRow(context.Background(),
		`SELECT id, trip_id, activity_id, title, amount, currency,
		        converted_amount, base_currency, category, created_at, updated_at
		 FROM expenses WHERE id = $1`, id)
	e, err := scan(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return e, nil
}

func (r *postgresRepository) Create(e *Expense) (*Expense, error) {
	row := r.db.QueryRow(context.Background(),
		`INSERT INTO expenses (trip_id, activity_id, title, amount, currency,
		                       converted_amount, base_currency, category)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, trip_id, activity_id, title, amount, currency,
		           converted_amount, base_currency, category, created_at, updated_at`,
		e.TripID, e.ActivityID, e.Title, e.Amount, e.Currency,
		e.ConvertedAmount, e.BaseCurrency, string(e.Category))
	out, err := scan(row)
	if err != nil {
		return nil, fmt.Errorf("expense.Create: %w", err)
	}
	return out, nil
}

func (r *postgresRepository) Update(e *Expense) (*Expense, error) {
	row := r.db.QueryRow(context.Background(),
		`UPDATE expenses
		    SET activity_id = $2, title = $3, amount = $4, currency = $5,
		        converted_amount = $6, base_currency = $7, category = $8,
		        updated_at = NOW()
		  WHERE id = $1
		  RETURNING id, trip_id, activity_id, title, amount, currency,
		            converted_amount, base_currency, category, created_at, updated_at`,
		e.ID, e.ActivityID, e.Title, e.Amount, e.Currency,
		e.ConvertedAmount, e.BaseCurrency, string(e.Category))
	out, err := scan(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("expense.Update: %w", err)
	}
	return out, nil
}

func (r *postgresRepository) Delete(id string) error {
	cmd, err := r.db.Exec(context.Background(),
		`DELETE FROM expenses WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("expense.Delete: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// Summary returns total + per-category totals in the trip's base currency.
// Aggregates use `converted_amount` which is stored at insert time.
func (r *postgresRepository) Summary(tripID, baseCurrency string) (*Summary, error) {
	rows, err := r.db.Query(context.Background(),
		`SELECT category, SUM(converted_amount) AS total
		 FROM expenses
		 WHERE trip_id = $1
		 GROUP BY category
		 ORDER BY total DESC`, tripID)
	if err != nil {
		return nil, fmt.Errorf("expense.Summary: %w", err)
	}
	defer rows.Close()

	cats := []CategoryTotal{}
	var total float64
	for rows.Next() {
		var cat string
		var sum float64
		if err := rows.Scan(&cat, &sum); err != nil {
			return nil, fmt.Errorf("expense.Summary scan: %w", err)
		}
		cats = append(cats, CategoryTotal{Category: Category(cat), Total: sum})
		total += sum
	}
	return &Summary{
		TotalBase:    total,
		BaseCurrency: baseCurrency,
		ByCategory:   cats,
	}, nil
}

// pgx Row interface satisfied by both QueryRow and rows from a Query.
type row interface {
	Scan(dest ...any) error
}

func scan(r row) (*Expense, error) {
	e := &Expense{}
	var cat string
	var activity *string
	err := r.Scan(
		&e.ID, &e.TripID, &activity, &e.Title, &e.Amount, &e.Currency,
		&e.ConvertedAmount, &e.BaseCurrency, &cat, &e.CreatedAt, &e.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	e.Category = Category(cat)
	e.ActivityID = activity
	return e, nil
}
