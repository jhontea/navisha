package trip

import (
	"context"
	"time"

	"github.com/ahmadhafizh/navisha/backend/internal/currency"
	"github.com/jackc/pgx/v5"
)

// mockRepo records calls and returns canned values. tx parameter is unused —
// mock methods never touch it, so passing nil pgx.Tx is safe.
type mockRepo struct {
	trips         map[string]*Trip
	insertedTrip  *Trip
	insertedDays  []Day
	beginTxCalls  int
	commitCalls   int
	rollbackCalls int

	insertTripErr  error
	insertDaysErr  error
	findErr        error
	listResult     ListResult
	listErr        error
	updateResult   *Trip
	updateErr      error
	deleteErr      error
	listDaysResult []Day
	listDaysErr    error

	dayOwners            map[string]string
	findDayOwnerErr      error
	updateDayNotesResult *Day
	updateDayNotesErr    error
}

func newMockRepo() *mockRepo {
	return &mockRepo{
		trips:     map[string]*Trip{},
		dayOwners: map[string]string{},
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
func (m *mockRepo) List(_, _ string, _ int) (ListResult, error) {
	return m.listResult, m.listErr
}
func (m *mockRepo) ListFiltered(_, _ string, _ int, _, _ string) (ListResult, error) {
	return m.listResult, m.listErr
}
func (m *mockRepo) ListUpcoming(_ string, _ int) ([]Trip, error) {
	return m.listResult.Trips, m.listErr
}
func (m *mockRepo) FindByID(id string) (*Trip, error) {
	if m.findErr != nil {
		return nil, m.findErr
	}
	if t, ok := m.trips[id]; ok {
		return t, nil
	}
	return nil, ErrNotFound
}
func (m *mockRepo) InsertTrip(_ context.Context, _ pgx.Tx, t *Trip) (*Trip, error) {
	if m.insertTripErr != nil {
		return nil, m.insertTripErr
	}
	out := *t
	out.ID = "new-trip-id"
	out.CreatedAt = time.Now()
	out.UpdatedAt = time.Now()
	m.insertedTrip = &out
	return &out, nil
}
func (m *mockRepo) InsertDays(_ context.Context, _ pgx.Tx, days []Day) error {
	if m.insertDaysErr != nil {
		return m.insertDaysErr
	}
	m.insertedDays = append(m.insertedDays, days...)
	return nil
}
func (m *mockRepo) DeleteDays(_ context.Context, _ pgx.Tx, _ string) error {
	// Reset inserted days so tests can verify regenerated days.
	m.insertedDays = nil
	return nil
}
func (m *mockRepo) Update(_ *Trip) (*Trip, error) {
	if m.updateErr != nil {
		return nil, m.updateErr
	}
	return m.updateResult, nil
}
func (m *mockRepo) Delete(_ string) error {
	return m.deleteErr
}
func (m *mockRepo) ListDays(_ string) ([]Day, error) {
	return m.listDaysResult, m.listDaysErr
}

func (m *mockRepo) FindDayOwner(dayID string) (string, error) {
	if m.findDayOwnerErr != nil {
		return "", m.findDayOwnerErr
	}
	if owner, ok := m.dayOwners[dayID]; ok {
		return owner, nil
	}
	return "", ErrDayNotFound
}

func (m *mockRepo) UpdateDayNotes(dayID, notes string) (*Day, error) {
	if m.updateDayNotesErr != nil {
		return nil, m.updateDayNotesErr
	}
	if m.updateDayNotesResult != nil {
		return m.updateDayNotesResult, nil
	}
	return &Day{ID: dayID, Notes: notes}, nil
}

// Test helpers

func setupCurrencies() {
	currency.SupportedCurrencies = []string{"IDR", "USD", "JPY"}
}

func date(y, m, d int) time.Time {
	return time.Date(y, time.Month(m), d, 0, 0, 0, 0, time.UTC)
}
