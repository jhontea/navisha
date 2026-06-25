package activity

import (
	"context"

	"github.com/jackc/pgx/v5"
)

// mockRepo records calls + returns canned values. Mirrors trip/mocks_test.go.
type mockRepo struct {
	activities map[string]*Activity
	dayOwners  map[string]string // dayID → userID
	dayIDs     map[string][]string

	beginTxCalls  int
	commitCalls   int
	rollbackCalls int

	insertResult *Activity
	insertErr    error
	updateResult *Activity
	updateErr    error
	deleteErr    error
	orderUpdates []orderUpdate

	listByDayResult []Activity
	listByDayErr    error
	findDayErr      error
	findActErr      error
	updateOrderErr  error

	listByDayIDsResult map[string][]Activity
	listByDayIDsErr    error
	batchUpdateErr     error
}

type orderUpdate struct {
	id    string
	order int
}

func newMockRepo() *mockRepo {
	return &mockRepo{
		activities: map[string]*Activity{},
		dayOwners:  map[string]string{},
		dayIDs:     map[string][]string{},
	}
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

func (m *mockRepo) FindDayOwner(dayID string) (string, error) {
	if m.findDayErr != nil {
		return "", m.findDayErr
	}
	if owner, ok := m.dayOwners[dayID]; ok {
		return owner, nil
	}
	return "", ErrDayNotFound
}

func (m *mockRepo) FindActivityOwner(activityID string) (string, string, error) {
	if m.findActErr != nil {
		return "", "", m.findActErr
	}
	a, ok := m.activities[activityID]
	if !ok {
		return "", "", ErrNotFound
	}
	owner, ok := m.dayOwners[a.DayID]
	if !ok {
		return "", "", ErrDayNotFound
	}
	return owner, a.DayID, nil
}

func (m *mockRepo) ListByDay(dayID string) ([]Activity, error) {
	return m.listByDayResult, m.listByDayErr
}

func (m *mockRepo) FindByID(id string) (*Activity, error) {
	if a, ok := m.activities[id]; ok {
		return a, nil
	}
	return nil, ErrNotFound
}

func (m *mockRepo) Insert(a *Activity) (*Activity, error) {
	if m.insertErr != nil {
		return nil, m.insertErr
	}
	if m.insertResult != nil {
		return m.insertResult, nil
	}
	out := *a
	out.ID = "new-act-id"
	m.activities[out.ID] = &out
	return &out, nil
}

func (m *mockRepo) Update(a *Activity) (*Activity, error) {
	if m.updateErr != nil {
		return nil, m.updateErr
	}
	if m.updateResult != nil {
		return m.updateResult, nil
	}
	m.activities[a.ID] = a
	return a, nil
}

func (m *mockRepo) Delete(id string) error {
	if m.deleteErr != nil {
		return m.deleteErr
	}
	delete(m.activities, id)
	return nil
}

func (m *mockRepo) UpdateOrderTx(_ context.Context, _ pgx.Tx, id string, order int) error {
	if m.updateOrderErr != nil {
		return m.updateOrderErr
	}
	m.orderUpdates = append(m.orderUpdates, orderUpdate{id, order})
	return nil
}

func (m *mockRepo) ListIDsByDay(dayID string) ([]string, error) {
	return m.dayIDs[dayID], nil
}

func (m *mockRepo) ListByDayIDs(_ context.Context, dayIDs []string) (map[string][]Activity, error) {
	if m.listByDayIDsErr != nil {
		return nil, m.listByDayIDsErr
	}
	if m.listByDayIDsResult != nil {
		return m.listByDayIDsResult, nil
	}
	// Default: return empty slices for all requested days.
	out := make(map[string][]Activity, len(dayIDs))
	for _, did := range dayIDs {
		out[did] = []Activity{}
	}
	return out, nil
}

func (m *mockRepo) BatchUpdateOrderTx(_ context.Context, _ pgx.Tx, orderMap map[string]int) error {
	if m.batchUpdateErr != nil {
		return m.batchUpdateErr
	}
	for id, order := range orderMap {
		m.orderUpdates = append(m.orderUpdates, orderUpdate{id, order})
	}
	return nil
}
