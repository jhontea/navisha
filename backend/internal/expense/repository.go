package expense

import "errors"

var ErrNotFound = errors.New("expense not found")

type Repository interface {
	List(tripID string) ([]Expense, error)
	FindByID(id string) (*Expense, error)
	Create(e *Expense) (*Expense, error)
	Update(e *Expense) (*Expense, error)
	Delete(id string) error
	Summary(tripID string) (*Summary, error)
}
