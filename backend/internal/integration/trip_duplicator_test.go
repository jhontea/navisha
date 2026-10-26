package integration

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"
	"unicode/utf8"

	"github.com/jhontea/navisha/backend/internal/accommodation"
	"github.com/jhontea/navisha/backend/internal/activity"
	"github.com/jhontea/navisha/backend/internal/apperr"
	"github.com/jhontea/navisha/backend/internal/transportation"
	"github.com/jhontea/navisha/backend/internal/trip"
)

type fakeDupTrips struct {
	src     *trip.Trip
	srcDays []trip.Day
	getErr  error
	created *trip.CreateInput
	deleted []string
}

func (f *fakeDupTrips) Create(_ context.Context, _ string, in trip.CreateInput) (*trip.Trip, error) {
	f.created = &in
	return &trip.Trip{ID: "new", Title: in.Title, StartDate: in.StartDate, EndDate: in.EndDate}, nil
}

func (f *fakeDupTrips) Get(_ context.Context, _ string, id string) (*trip.Trip, []trip.Day, error) {
	if f.getErr != nil {
		return nil, nil, f.getErr
	}
	if id == "new" {
		days := make([]trip.Day, len(f.created.Days))
		for i := range days {
			days[i] = trip.Day{ID: "new-day-" + string(rune('1'+i)), DayNumber: i + 1}
		}
		return &trip.Trip{ID: "new"}, days, nil
	}
	return f.src, append([]trip.Day(nil), f.srcDays...), nil
}

func (f *fakeDupTrips) Delete(_ context.Context, _ string, id string) error {
	f.deleted = append(f.deleted, id)
	return nil
}

type fakeDupActivities struct {
	byDay   map[string][]activity.Activity
	created []activity.CreateManyInput
	err     error
}

func (f *fakeDupActivities) ListByTrip(context.Context, string, string) (map[string][]activity.Activity, error) {
	return f.byDay, nil
}

func (f *fakeDupActivities) CreateMany(_ context.Context, _ string, in []activity.CreateManyInput) error {
	f.created = in
	return f.err
}

type fakeDupTransports struct {
	legs    []transportation.Transportation
	created []transportation.CreateInput
	err     error
}

func (f *fakeDupTransports) List(context.Context, string, string) ([]transportation.Transportation, error) {
	return f.legs, nil
}

func (f *fakeDupTransports) Create(_ context.Context, _, _ string, in transportation.CreateInput) (*transportation.Transportation, error) {
	f.created = append(f.created, in)
	return &transportation.Transportation{}, f.err
}

type fakeDupStays struct {
	stays   []accommodation.Accommodation
	created []accommodation.CreateInput
}

func (f *fakeDupStays) List(context.Context, string, string) ([]accommodation.Accommodation, error) {
	return f.stays, nil
}

func (f *fakeDupStays) Create(_ context.Context, _, _ string, in accommodation.CreateInput) (*accommodation.Accommodation, error) {
	f.created = append(f.created, in)
	return &accommodation.Accommodation{}, nil
}

func d(y int, m time.Month, day int) time.Time { return time.Date(y, m, day, 0, 0, 0, 0, time.UTC) }

// newDupFixture is a 3-day source trip 2026-12-30..2027-01-01 with an
// evening flight and a stay, as the DB driver returns them (+07:00 zone).
func newDupFixture() (*fakeDupTrips, *fakeDupActivities, *fakeDupTransports, *fakeDupStays) {
	jakarta := time.FixedZone("WIB", 7*3600)
	dep := time.Date(2026, 12, 30, 20, 0, 0, 0, time.UTC).In(jakarta) // shows as 31 Dec 03:00 local
	arr := time.Date(2026, 12, 30, 23, 30, 0, 0, time.UTC).In(jakarta)
	trips := &fakeDupTrips{
		src: &trip.Trip{ID: "src", Title: "Japan Spring", Description: "Tokyo", StartDate: d(2026, 12, 30), EndDate: d(2027, 1, 1),
			BaseCurrency: "JPY", Budget: 1000, BudgetCategories: map[string]float64{"food": 500}, Notes: "trip notes"},
		// Out of order on purpose; day numbers decide.
		srcDays: []trip.Day{
			{ID: "s3", DayNumber: 3, Title: "Home"},
			{ID: "s1", DayNumber: 1, Title: "Arrive", Notes: "day1 notes"},
			{ID: "s2", DayNumber: 2},
		},
	}
	acts := &fakeDupActivities{byDay: map[string][]activity.Activity{
		"s1": {
			{Type: activity.TypeLocation, Title: "Shrine", StartTime: "09:00", Payload: json.RawMessage(`{"location_name":"Meiji","lat":35.6}`)},
			{Type: activity.TypeTodo, Title: "Pack", Payload: json.RawMessage(`{"items":[{"id":"a","text":"x","completed":true},{"id":"b","text":"y","completed":false}]}`)},
		},
		"s3": {{Type: activity.TypeNote, Title: "Fly", Payload: json.RawMessage(`{"content":"bye"}`)}},
	}}
	transports := &fakeDupTransports{legs: []transportation.Transportation{
		{Type: transportation.TypeFlight, Label: "GA 1", ReferenceNumber: "ABC123", DepartureDatetime: &dep, ArrivalDatetime: &arr},
		{Type: transportation.TypeTrain, Label: "no time"},
	}}
	stays := &fakeDupStays{stays: []accommodation.Accommodation{
		{Name: "Hotel", CheckIn: d(2026, 12, 30), CheckOut: d(2027, 1, 1), CheckInTime: "15:00", ConfirmationNumber: "CONF"},
	}}
	return trips, acts, transports, stays
}

func TestTripDuplicator_CopiesTripShiftedAcrossMonthAndYear(t *testing.T) {
	trips, acts, transports, stays := newDupFixture()
	dup := NewTripDuplicator(trips, acts, transports, stays)

	got, err := dup.Duplicate(context.Background(), "u1", "src", DuplicateInput{StartDate: d(2027, 2, 27), IncludeBookings: true})
	if err != nil {
		t.Fatalf("Duplicate: %v", err)
	}
	if got.ID != "new" || len(trips.deleted) != 0 {
		t.Fatalf("got %+v deleted %v", got, trips.deleted)
	}
	in := trips.created
	if in.Title != "Japan Spring (copy)" || !in.StartDate.Equal(d(2027, 2, 27)) || !in.EndDate.Equal(d(2027, 3, 1)) {
		t.Errorf("trip input = %q %v..%v", in.Title, in.StartDate, in.EndDate)
	}
	if in.Description != "Tokyo" || in.BaseCurrency != "JPY" || in.Budget != 1000 || in.BudgetCategories["food"] != 500 || in.Notes != "trip notes" {
		t.Errorf("trip info not copied: %+v", in)
	}
	if len(in.Days) != 3 || in.Days[0].Title != "Arrive" || in.Days[0].Notes != "day1 notes" || in.Days[2].Title != "Home" {
		t.Errorf("days = %+v", in.Days)
	}

	if len(acts.created) != 3 {
		t.Fatalf("activities = %+v", acts.created)
	}
	if acts.created[0].DayID != "new-day-1" || acts.created[0].Title != "Shrine" || string(acts.created[0].Payload) != `{"location_name":"Meiji","lat":35.6}` {
		t.Errorf("activity 0 = %+v", acts.created[0])
	}
	if acts.created[1].Title != "Pack" || strings.Contains(string(acts.created[1].Payload), "true") {
		t.Errorf("todo not unchecked: %s", acts.created[1].Payload)
	}
	if acts.created[2].DayID != "new-day-3" {
		t.Errorf("note day = %s", acts.created[2].DayID)
	}

	// 2026-12-30 -> 2027-02-27 is 59 days; 20:00 stays 20:00.
	flight := transports.created[0]
	if flight.ReferenceNumber != "" || flight.Cost != nil {
		t.Errorf("flight kept ref/cost: %+v", flight)
	}
	if want := time.Date(2027, 2, 27, 20, 0, 0, 0, time.UTC); !flight.DepartureDatetime.Equal(want) || flight.DepartureDatetime.Location() != time.UTC {
		t.Errorf("departure = %v, want %v", flight.DepartureDatetime, want)
	}
	if want := time.Date(2027, 2, 27, 23, 30, 0, 0, time.UTC); !flight.ArrivalDatetime.Equal(want) {
		t.Errorf("arrival = %v, want %v", flight.ArrivalDatetime, want)
	}
	if transports.created[1].DepartureDatetime != nil || transports.created[1].ArrivalDatetime != nil {
		t.Errorf("undated leg got dates: %+v", transports.created[1])
	}
	stay := stays.created[0]
	if !stay.CheckIn.Equal(d(2027, 2, 27)) || !stay.CheckOut.Equal(d(2027, 3, 1)) || stay.CheckInTime != "15:00" ||
		stay.ConfirmationNumber != "" || stay.Cost != nil {
		t.Errorf("stay = %+v", stay)
	}
}

func TestTripDuplicator_WithoutBookingsAndCustomTitle(t *testing.T) {
	trips, acts, transports, stays := newDupFixture()
	dup := NewTripDuplicator(trips, acts, transports, stays)

	if _, err := dup.Duplicate(context.Background(), "u1", "src", DuplicateInput{StartDate: d(2026, 12, 1), Title: "Next year"}); err != nil {
		t.Fatalf("Duplicate: %v", err)
	}
	if trips.created.Title != "Next year" || !trips.created.EndDate.Equal(d(2026, 12, 3)) {
		t.Errorf("trip input = %+v", trips.created)
	}
	if len(transports.created) != 0 || len(stays.created) != 0 {
		t.Errorf("bookings copied without include_bookings")
	}
}

func TestTripDuplicator_OneDayTripAndOddTodoPayload(t *testing.T) {
	trips, acts, transports, stays := newDupFixture()
	trips.src.EndDate = trips.src.StartDate
	trips.srcDays = []trip.Day{{ID: "s1", DayNumber: 1}}
	acts.byDay = map[string][]activity.Activity{"s1": {
		{Type: activity.TypeTodo, Title: "old", Payload: json.RawMessage(`{"legacy":"x"}`)},
		{Type: activity.TypeTodo, Title: "bad", Payload: json.RawMessage(`not json`)},
	}}
	dup := NewTripDuplicator(trips, acts, transports, stays)

	if _, err := dup.Duplicate(context.Background(), "u1", "src", DuplicateInput{StartDate: d(2027, 1, 5), Title: "  "}); err != nil {
		t.Fatalf("Duplicate: %v", err)
	}
	if !trips.created.EndDate.Equal(d(2027, 1, 5)) || len(trips.created.Days) != 1 || trips.created.Title != "Japan Spring (copy)" {
		t.Errorf("trip input = %+v", trips.created)
	}
	if string(acts.created[0].Payload) != `{"legacy":"x"}` || string(acts.created[1].Payload) != `not json` {
		t.Errorf("odd payloads changed: %s / %s", acts.created[0].Payload, acts.created[1].Payload)
	}
}

func TestTripDuplicator_DeletesCopyWhenLaterStepFails(t *testing.T) {
	for name, setup := range map[string]func(*fakeDupActivities, *fakeDupTransports){
		"activities": func(a *fakeDupActivities, _ *fakeDupTransports) { a.err = errors.New("boom") },
		"transport":  func(_ *fakeDupActivities, tr *fakeDupTransports) { tr.err = errors.New("boom") },
	} {
		t.Run(name, func(t *testing.T) {
			trips, acts, transports, stays := newDupFixture()
			setup(acts, transports)
			dup := NewTripDuplicator(trips, acts, transports, stays)

			_, err := dup.Duplicate(context.Background(), "u1", "src", DuplicateInput{StartDate: d(2027, 1, 5), IncludeBookings: true})
			if err == nil {
				t.Fatal("expected error")
			}
			if len(trips.deleted) != 1 || trips.deleted[0] != "new" {
				t.Errorf("deleted = %v, want [new]", trips.deleted)
			}
		})
	}
}

func TestTripDuplicator_ForbiddenSourceCreatesNothing(t *testing.T) {
	trips, acts, transports, stays := newDupFixture()
	trips.getErr = apperr.ErrForbidden
	dup := NewTripDuplicator(trips, acts, transports, stays)

	_, err := dup.Duplicate(context.Background(), "u1", "src", DuplicateInput{StartDate: d(2027, 1, 5)})
	if !errors.Is(err, apperr.ErrForbidden) || trips.created != nil {
		t.Errorf("err = %v, created = %v", err, trips.created)
	}
}

func TestCopyTitle_TrimsToLimitOnRuneBoundary(t *testing.T) {
	got := copyTitle(strings.Repeat("日", 100)) // 300 bytes
	if len(got) > maxTripTitleBytes || !strings.HasSuffix(got, copySuffix) || !utf8.ValidString(got) {
		t.Errorf("copyTitle = %q (%d bytes)", got, len(got))
	}
	if got := copyTitle("Bali"); got != "Bali (copy)" {
		t.Errorf("copyTitle = %q", got)
	}
}
