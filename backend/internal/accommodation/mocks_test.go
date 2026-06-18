package accommodation

import (
	"context"

	"github.com/jackc/pgx/v5"
)

type mockRepo struct {
	tripOwners map[string]string
	items      map[string]*Accommodation
	itemOf     map[string]string

	listResult []Accommodation
	listErr    error
	insertResp *Accommodation
	insertErr  error
	updateResp *Accommodation
	updateErr  error
	deleteErr  error

	tripOwnerErr error
	itemOwnerErr error

	beginTxCalls  int
	commitCalls   int
	rollbackCalls int
}

func newMockRepo() *mockRepo {
	return &mockRepo{
		tripOwners: map[string]string{},
		items:      map[string]*Accommodation{},
		itemOf:     map[string]string{},
	}
}

func (m *mockRepo) FindTripOwner(tripID string) (string, error) {
	if m.tripOwnerErr != nil {
		return "", m.tripOwnerErr
	}
	if owner, ok := m.tripOwners[tripID]; ok {
		return owner, nil
	}
	return "", ErrTripNotFound
}

func (m *mockRepo) FindAccommodationOwner(id string) (string, string, error) {
	if m.itemOwnerErr != nil {
		return "", "", m.itemOwnerErr
	}
	tripID, ok := m.itemOf[id]
	if !ok {
		return "", "", ErrNotFound
	}
	return m.tripOwners[tripID], tripID, nil
}

func (m *mockRepo) List(_ string) ([]Accommodation, error) {
	return m.listResult, m.listErr
}

func (m *mockRepo) FindByID(id string) (*Accommodation, error) {
	if a, ok := m.items[id]; ok {
		return a, nil
	}
	return nil, ErrNotFound
}

func (m *mockRepo) Insert(a *Accommodation) (*Accommodation, error) {
	if m.insertErr != nil {
		return nil, m.insertErr
	}
	if m.insertResp != nil {
		return m.insertResp, nil
	}
	out := *a
	out.ID = "new-stay-id"
	m.items[out.ID] = &out
	m.itemOf[out.ID] = a.TripID
	return &out, nil
}

func (m *mockRepo) Update(a *Accommodation) (*Accommodation, error) {
	if m.updateErr != nil {
		return nil, m.updateErr
	}
	if m.updateResp != nil {
		return m.updateResp, nil
	}
	m.items[a.ID] = a
	return a, nil
}

func (m *mockRepo) Delete(id string) error {
	if m.deleteErr != nil {
		return m.deleteErr
	}
	delete(m.items, id)
	return nil
}

func (m *mockRepo) BeginTx(_ context.Context) (pgx.Tx, error) {
	m.beginTxCalls++
	return nil, nil
}
func (m *mockRepo) Commit(_ context.Context, _ pgx.Tx) error {
	m.commitCalls++
	return nil
}
func (m *mockRepo) Rollback(_ context.Context, _ pgx.Tx) error {
	m.rollbackCalls++
	return nil
}
func (m *mockRepo) InsertTx(_ context.Context, _ pgx.Tx, a *Accommodation) (*Accommodation, error) {
	return m.Insert(a)
}

// mockExpenseCreator satisfies ExpenseCreator.
type mockExpenseCreator struct {
	calls      int
	lastUser   string
	lastTrip   string
	lastTitle  string
	lastAmount float64
	err        error
}

func (m *mockExpenseCreator) CreateLinkedExpenseTx(
	_ context.Context, _ pgx.Tx,
	userID, tripID, title, _, _ string, amount float64,
) error {
	m.calls++
	m.lastUser = userID
	m.lastTrip = tripID
	m.lastTitle = title
	m.lastAmount = amount
	return m.err
}
