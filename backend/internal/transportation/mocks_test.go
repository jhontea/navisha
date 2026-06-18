package transportation

import (
	"context"

	"github.com/jackc/pgx/v5"
)

type mockRepo struct {
	tripOwners map[string]string // tripID → userID
	items      map[string]*Transportation
	itemOf     map[string]string // transportationID → tripID

	listResult []Transportation
	listErr    error
	insertResp *Transportation
	insertErr  error
	updateResp *Transportation
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
		items:      map[string]*Transportation{},
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

func (m *mockRepo) FindTransportationOwner(id string) (string, string, error) {
	if m.itemOwnerErr != nil {
		return "", "", m.itemOwnerErr
	}
	tripID, ok := m.itemOf[id]
	if !ok {
		return "", "", ErrNotFound
	}
	return m.tripOwners[tripID], tripID, nil
}

func (m *mockRepo) List(_ string) ([]Transportation, error) {
	return m.listResult, m.listErr
}

func (m *mockRepo) FindByID(id string) (*Transportation, error) {
	if t, ok := m.items[id]; ok {
		return t, nil
	}
	return nil, ErrNotFound
}

func (m *mockRepo) Insert(t *Transportation) (*Transportation, error) {
	if m.insertErr != nil {
		return nil, m.insertErr
	}
	if m.insertResp != nil {
		return m.insertResp, nil
	}
	out := *t
	out.ID = "new-tx-id"
	m.items[out.ID] = &out
	m.itemOf[out.ID] = t.TripID
	return &out, nil
}

func (m *mockRepo) Update(t *Transportation) (*Transportation, error) {
	if m.updateErr != nil {
		return nil, m.updateErr
	}
	if m.updateResp != nil {
		return m.updateResp, nil
	}
	m.items[t.ID] = t
	return t, nil
}

func (m *mockRepo) Delete(id string) error {
	if m.deleteErr != nil {
		return m.deleteErr
	}
	delete(m.items, id)
	return nil
}

// Transaction methods — tx is opaque in tests; track calls instead.
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
func (m *mockRepo) InsertTx(_ context.Context, _ pgx.Tx, t *Transportation) (*Transportation, error) {
	return m.Insert(t)
}

// mockExpenseCreator satisfies ExpenseCreator. Records last call args.
type mockExpenseCreator struct {
	calls    int
	lastUser string
	lastTrip string
	lastTitle string
	lastAmount float64
	err      error
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
