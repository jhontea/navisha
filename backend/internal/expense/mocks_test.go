package expense

import (
	"context"

	"github.com/jackc/pgx/v5"
)

type mockRepo struct {
	trips     map[string]tripMeta // tripID → owner + base
	expenses  map[string]*Expense
	expenseOf map[string]string // expenseID → tripID

	listResult    []Expense
	listErr       error
	createResult  *Expense
	createErr     error
	updateResult  *Expense
	updateErr     error
	deleteErr     error
	summaryResult *Summary
	summaryErr    error

	tripOwnerErr error
	expOwnerErr  error
}

type tripMeta struct {
	owner string
	base  string
}

func newMockRepo() *mockRepo {
	return &mockRepo{
		trips:     map[string]tripMeta{},
		expenses:  map[string]*Expense{},
		expenseOf: map[string]string{},
	}
}

func (m *mockRepo) FindTripOwner(tripID string) (string, string, error) {
	if m.tripOwnerErr != nil {
		return "", "", m.tripOwnerErr
	}
	t, ok := m.trips[tripID]
	if !ok {
		return "", "", ErrTripNotFound
	}
	return t.owner, t.base, nil
}

func (m *mockRepo) FindExpenseOwner(id string) (string, string, error) {
	if m.expOwnerErr != nil {
		return "", "", m.expOwnerErr
	}
	tripID, ok := m.expenseOf[id]
	if !ok {
		return "", "", ErrNotFound
	}
	return m.trips[tripID].owner, tripID, nil
}

func (m *mockRepo) List(_ string) ([]Expense, error) {
	return m.listResult, m.listErr
}

func (m *mockRepo) FindByID(id string) (*Expense, error) {
	if e, ok := m.expenses[id]; ok {
		return e, nil
	}
	return nil, ErrNotFound
}

func (m *mockRepo) Create(e *Expense) (*Expense, error) {
	if m.createErr != nil {
		return nil, m.createErr
	}
	if m.createResult != nil {
		return m.createResult, nil
	}
	out := *e
	out.ID = "new-exp-id"
	m.expenses[out.ID] = &out
	m.expenseOf[out.ID] = e.TripID
	return &out, nil
}

func (m *mockRepo) Update(e *Expense) (*Expense, error) {
	if m.updateErr != nil {
		return nil, m.updateErr
	}
	if m.updateResult != nil {
		return m.updateResult, nil
	}
	m.expenses[e.ID] = e
	return e, nil
}

func (m *mockRepo) Delete(id string) error {
	if m.deleteErr != nil {
		return m.deleteErr
	}
	delete(m.expenses, id)
	return nil
}

func (m *mockRepo) Summary(_, _ string) (*Summary, error) {
	return m.summaryResult, m.summaryErr
}

func (m *mockRepo) CreateTx(_ context.Context, _ pgx.Tx, e *Expense) (*Expense, error) {
	// Reuse the same code path as Create for tests; the tx parameter is
	// inert at this level.
	return m.Create(e)
}

// mockConverter returns a fixed multiplier.
type mockConverter struct {
	rate float64
	err  error
}

func (m *mockConverter) Convert(_, _ string, amount float64) (float64, float64, error) {
	if m.err != nil {
		return 0, 0, m.err
	}
	return amount * m.rate, m.rate, nil
}
