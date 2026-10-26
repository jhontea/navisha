package trip

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jhontea/navisha/backend/internal/currency"
)

// mockRepo records calls and returns canned values. tx parameter is unused —
// mock methods never touch it, so passing nil pgx.Tx is safe.
type mockRepo struct {
	trips         map[string]*Trip
	insertedTrip  *Trip
	insertedDays  []Day
	resizeCalls   []string
	resizeErr     error
	beginTxCalls  int
	commitCalls   int
	rollbackCalls int

	insertTripErr  error
	insertDaysErr  error
	findErr        error
	listResult     ListResult
	listErr        error
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
func (m *mockRepo) List(_ context.Context, _, _ string, _ int) (ListResult, error) {
	return m.listResult, m.listErr
}
func (m *mockRepo) ListFiltered(_ context.Context, _, _ string, _ int, _, _ string) (ListResult, error) {
	return m.listResult, m.listErr
}
func (m *mockRepo) ListUpcoming(_ context.Context, _ string, _ int) ([]Trip, error) {
	return m.listResult.Trips, m.listErr
}
func (m *mockRepo) FindByID(_ context.Context, id string) (*Trip, error) {
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
func (m *mockRepo) ResizeDaysTx(_ context.Context, _ pgx.Tx, tripID string, start, end time.Time) error {
	m.resizeCalls = append(m.resizeCalls, tripID+":"+start.Format("2006-01-02")+".."+end.Format("2006-01-02"))
	return m.resizeErr
}
func (m *mockRepo) Update(_ context.Context, t *Trip) (*Trip, error) {
	if m.updateErr != nil {
		return nil, m.updateErr
	}
	out := *t
	out.UpdatedAt = time.Now()
	m.trips[t.ID] = &out
	return &out, nil
}
func (m *mockRepo) UpdateTx(_ context.Context, _ pgx.Tx, t *Trip) (*Trip, error) {
	return m.Update(context.Background(), t)
}
func (m *mockRepo) Delete(_ context.Context, _ string) error {
	return m.deleteErr
}
func (m *mockRepo) ListDays(_ context.Context, _ string) ([]Day, error) {
	return m.listDaysResult, m.listDaysErr
}

func (m *mockRepo) FindDayOwner(_ context.Context, dayID string) (string, error) {
	if m.findDayOwnerErr != nil {
		return "", m.findDayOwnerErr
	}
	if owner, ok := m.dayOwners[dayID]; ok {
		return owner, nil
	}
	return "", ErrDayNotFound
}

func (m *mockRepo) UpdateDayNotes(_ context.Context, dayID, notes string) (*Day, error) {
	if m.updateDayNotesErr != nil {
		return nil, m.updateDayNotesErr
	}
	if m.updateDayNotesResult != nil {
		return m.updateDayNotesResult, nil
	}
	return &Day{ID: dayID, Notes: notes}, nil
}

func (m *mockRepo) UpdateDayTitle(_ context.Context, dayID, title string) (*Day, error) {
	return &Day{ID: dayID, Title: title}, nil
}

// Test helpers

func setupCurrencies() {
	currency.SupportedCurrencies = []string{"IDR", "USD", "JPY"}
}

func date(y, m, d int) time.Time {
	return time.Date(y, time.Month(m), d, 0, 0, 0, 0, time.UTC)
}

// mockRebaser records expense reconversion requests from Update.
type mockRebaser struct {
	calls []string // "tripID→newBase"
	err   error
}

func (m *mockRebaser) RebaseTx(_ context.Context, _ pgx.Tx, tripID, newBase string) error {
	m.calls = append(m.calls, tripID+"→"+newBase)
	return m.err
}

// ConvertAmount uses a fixed IDR→USD rate of 1/16000 for budget tests.
func (m *mockRebaser) ConvertAmount(_ context.Context, from, to string, amount float64) (float64, error) {
	if m.err != nil {
		return 0, m.err
	}
	if from == "IDR" && to == "USD" {
		return amount / 16000, nil
	}
	return amount, nil
}
