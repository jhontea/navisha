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

func (r *postgresRepository) FindTripOwner(ctx context.Context, tripID string) (string, string, error) {
	var userID, base string
	err := r.db.QueryRow(ctx,
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

func (r *postgresRepository) FindExpenseOwner(ctx context.Context, expenseID string) (string, string, error) {
	var userID, tripID string
	err := r.db.QueryRow(ctx,
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

func (r *postgresRepository) List(ctx context.Context, tripID string) ([]Expense, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, trip_id, activity_id, title, amount, currency,
		        converted_amount, base_currency, category, expense_date, note, created_at, updated_at,
		        transportation_id, accommodation_id
		 FROM expenses
		 WHERE trip_id = $1
		 ORDER BY expense_date DESC, created_at DESC`, tripID)
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

func (r *postgresRepository) FindByID(ctx context.Context, id string) (*Expense, error) {
	row := r.db.QueryRow(ctx,
		`SELECT id, trip_id, activity_id, title, amount, currency,
		        converted_amount, base_currency, category, expense_date, note, created_at, updated_at,
		        transportation_id, accommodation_id
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

func (r *postgresRepository) Create(ctx context.Context, e *Expense) (*Expense, error) {
	row := r.db.QueryRow(ctx,
		`INSERT INTO expenses (trip_id, activity_id, title, amount, currency,
		                       converted_amount, base_currency, category, expense_date, note,
		                       transportation_id, accommodation_id)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		 RETURNING id, trip_id, activity_id, title, amount, currency,
		           converted_amount, base_currency, category, expense_date, note, created_at, updated_at,
		        transportation_id, accommodation_id`,
		e.TripID, e.ActivityID, e.Title, e.Amount, e.Currency,
		e.ConvertedAmount, e.BaseCurrency, string(e.Category), e.ExpenseDate, e.Note,
		e.TransportationID, e.AccommodationID)
	out, err := scan(row)
	if err != nil {
		return nil, fmt.Errorf("expense.Create: %w", err)
	}
	return out, nil
}

func (r *postgresRepository) CreateTx(ctx context.Context, tx pgx.Tx, e *Expense) (*Expense, error) {
	row := tx.QueryRow(ctx,
		`INSERT INTO expenses (trip_id, activity_id, title, amount, currency,
		                       converted_amount, base_currency, category, expense_date, note,
		                       transportation_id, accommodation_id)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		 RETURNING id, trip_id, activity_id, title, amount, currency,
		           converted_amount, base_currency, category, expense_date, note, created_at, updated_at,
		        transportation_id, accommodation_id`,
		e.TripID, e.ActivityID, e.Title, e.Amount, e.Currency,
		e.ConvertedAmount, e.BaseCurrency, string(e.Category), e.ExpenseDate, e.Note,
		e.TransportationID, e.AccommodationID)
	out, err := scan(row)
	if err != nil {
		return nil, fmt.Errorf("expense.CreateTx: %w", err)
	}
	return out, nil
}

func (r *postgresRepository) Update(ctx context.Context, e *Expense) (*Expense, error) {
	row := r.db.QueryRow(ctx,
		`UPDATE expenses
		    SET activity_id = $2, title = $3, amount = $4, currency = $5,
		        converted_amount = $6, base_currency = $7, category = $8,
		        expense_date = $9, note = $10, updated_at = NOW()
		  WHERE id = $1
		  RETURNING id, trip_id, activity_id, title, amount, currency,
		            converted_amount, base_currency, category, expense_date, note, created_at, updated_at,
		        transportation_id, accommodation_id`,
		e.ID, e.ActivityID, e.Title, e.Amount, e.Currency,
		e.ConvertedAmount, e.BaseCurrency, string(e.Category), e.ExpenseDate, e.Note)
	out, err := scan(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("expense.Update: %w", err)
	}
	return out, nil
}

func (r *postgresRepository) ListForRebaseTx(ctx context.Context, tx pgx.Tx, tripID string) ([]Expense, error) {
	rows, err := tx.Query(ctx,
		`SELECT id, amount, currency
		 FROM expenses
		 WHERE trip_id = $1
		 FOR UPDATE`, tripID)
	if err != nil {
		return nil, fmt.Errorf("expense.ListForRebaseTx: %w", err)
	}
	defer rows.Close()

	out := []Expense{}
	for rows.Next() {
		e := Expense{TripID: tripID}
		if err := rows.Scan(&e.ID, &e.Amount, &e.Currency); err != nil {
			return nil, fmt.Errorf("expense.ListForRebaseTx scan: %w", err)
		}
		out = append(out, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("expense.ListForRebaseTx rows: %w", err)
	}
	return out, nil
}

func (r *postgresRepository) UpdateConvertedTx(ctx context.Context, tx pgx.Tx, id string, converted float64, base string) error {
	cmd, err := tx.Exec(ctx,
		`UPDATE expenses
		    SET converted_amount = $2, base_currency = $3, updated_at = NOW()
		  WHERE id = $1`, id, converted, base)
	if err != nil {
		return fmt.Errorf("expense.UpdateConvertedTx: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *postgresRepository) Delete(ctx context.Context, id string) error {
	cmd, err := r.db.Exec(ctx,
		`DELETE FROM expenses WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("expense.Delete: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// linkColumns are the booking link columns FindLinkedTx may filter on.
var linkColumns = map[string]bool{"transportation_id": true, "accommodation_id": true}

func (r *postgresRepository) FindLinkedTx(ctx context.Context, tx pgx.Tx, column, bookingID string) (*Expense, error) {
	if !linkColumns[column] {
		return nil, fmt.Errorf("expense.FindLinkedTx: unknown link column %q", column)
	}
	row := tx.QueryRow(ctx,
		`SELECT id, trip_id, activity_id, title, amount, currency,
		        converted_amount, base_currency, category, expense_date, note, created_at, updated_at,
		        transportation_id, accommodation_id
		 FROM expenses WHERE `+column+` = $1
		 FOR UPDATE`, bookingID)
	e, err := scan(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("expense.FindLinkedTx: %w", err)
	}
	return e, nil
}

func (r *postgresRepository) UpdateCostTx(ctx context.Context, tx pgx.Tx, id string, amount float64, currency string, converted float64, base string) error {
	_, err := tx.Exec(ctx,
		`UPDATE expenses
		    SET amount = $2, currency = $3, converted_amount = $4, base_currency = $5, updated_at = NOW()
		  WHERE id = $1`,
		id, amount, currency, converted, base)
	if err != nil {
		return fmt.Errorf("expense.UpdateCostTx: %w", err)
	}
	return nil
}

func (r *postgresRepository) DeleteTx(ctx context.Context, tx pgx.Tx, id string) error {
	if _, err := tx.Exec(ctx, `DELETE FROM expenses WHERE id = $1`, id); err != nil {
		return fmt.Errorf("expense.DeleteTx: %w", err)
	}
	return nil
}

// Summary returns total + per-category totals in the trip's base currency.
// Aggregates use `converted_amount` which is stored at insert time.
func (r *postgresRepository) Summary(ctx context.Context, tripID, baseCurrency string) (*Summary, error) {
	rows, err := r.db.Query(ctx,
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
		&e.ConvertedAmount, &e.BaseCurrency, &cat, &e.ExpenseDate, &e.Note, &e.CreatedAt, &e.UpdatedAt,
		&e.TransportationID, &e.AccommodationID,
	)
	if err != nil {
		return nil, err
	}
	e.Category = Category(cat)
	e.ActivityID = activity
	return e, nil
}
