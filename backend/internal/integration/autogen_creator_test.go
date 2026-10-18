package integration

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/jhontea/navisha/backend/internal/accommodation"
	"github.com/jhontea/navisha/backend/internal/activity"
	"github.com/jhontea/navisha/backend/internal/autogen"
	"github.com/jhontea/navisha/backend/internal/transportation"
	"github.com/jhontea/navisha/backend/internal/trip"
)

type fakeDraftTrips struct {
	created *trip.CreateInput
	deleted []string
}

func (f *fakeDraftTrips) Create(_ context.Context, _ string, in trip.CreateInput) (*trip.Trip, error) {
	f.created = &in
	return &trip.Trip{ID: "trip-1"}, nil
}

func (f *fakeDraftTrips) Get(context.Context, string, string) (*trip.Trip, []trip.Day, error) {
	return &trip.Trip{ID: "trip-1"}, []trip.Day{{ID: "day-1", DayNumber: 1}, {ID: "day-2", DayNumber: 2}}, nil
}

func (f *fakeDraftTrips) Delete(_ context.Context, _ string, id string) error {
	f.deleted = append(f.deleted, id)
	return nil
}

type fakeDraftActivities struct{ batch []activity.CreateManyInput }

func (f *fakeDraftActivities) CreateMany(_ context.Context, _ string, in []activity.CreateManyInput) error {
	f.batch = in
	return nil
}

type fakeDraftTransports struct {
	created []transportation.CreateInput
	err     error
}

func (f *fakeDraftTransports) Create(_ context.Context, _, _ string, in transportation.CreateInput) (*transportation.Transportation, error) {
	if f.err != nil {
		return nil, f.err
	}
	f.created = append(f.created, in)
	return &transportation.Transportation{}, nil
}

type fakeDraftStays struct{ created []accommodation.CreateInput }

func (f *fakeDraftStays) Create(_ context.Context, _, _ string, in accommodation.CreateInput) (*accommodation.Accommodation, error) {
	f.created = append(f.created, in)
	return &accommodation.Accommodation{}, nil
}

func fanMeetingDraft() autogen.TripDraft {
	lat, lng := -6.12, 106.84
	return autogen.TripDraft{
		Title: "Ancol: Fan Meeting", BaseCurrency: "IDR", Budget: 2500000,
		Days: []autogen.DayDraft{
			{DayNumber: 1, Activities: []autogen.ActivityDraft{{Type: "location", Title: "Fan Meeting", StartTime: "14:00", EndTime: "17:00", LocationName: "Beach City International Stadium"}}},
			{DayNumber: 2},
		},
		TransportLegs: []autogen.TransportLegDraft{
			{Mode: "car", Label: "Majalengka → Ancol", FromLocation: "Majalengka", ToLocation: "Ancol",
				DepartureDate: "2026-11-07", DepartureTime: "04:00", ArrivalDate: "2026-11-07", ArrivalTime: "08:00",
				EstimatedCost: 440000, Notes: "Lewat Tol Cipali."},
			{Mode: "car", FromLocation: "Ancol", ToLocation: "Majalengka",
				DepartureDate: "2026-11-08", DepartureTime: "bad", ArrivalDate: "2026-11-08", ArrivalTime: "17:00"},
		},
		Lodging: []autogen.LodgingDraft{{
			Name: "Mercure Convention Center Ancol", LocationName: "Mercure Ancol",
			CheckInDate: "2026-11-07", CheckInTime: "18:00", CheckOutDate: "2026-11-08", CheckOutTime: "12:00",
			EstimatedCostPerNight: 950000, Lat: &lat, Lng: &lng, GooglePlaceID: "place-1",
		}},
		BudgetBreakdown: autogen.BudgetBreakdown{Transport: 880000, Accommodation: 950000, Food: 650000, Activity: 270000},
	}
}

func TestAutogenCreator_SavesBookingsAndBudgetPlan(t *testing.T) {
	trips, acts, transports, stays := &fakeDraftTrips{}, &fakeDraftActivities{}, &fakeDraftTransports{}, &fakeDraftStays{}
	c := NewAutogenCreator(trips, acts, transports, stays)

	id, err := c.CreateFromDraft(context.Background(), "u1", fanMeetingDraft(), "2026-11-07", "2026-11-08", "", "")
	if err != nil || id != "trip-1" {
		t.Fatalf("CreateFromDraft = %q, %v", id, err)
	}

	// The split is a plan; the total is raised to fit it (2.75M > 2.5M).
	if trips.created.Budget != 2750000 || trips.created.BudgetCategories["transport"] != 880000 ||
		len(trips.created.BudgetCategories) != 4 {
		t.Errorf("trip input = %+v", trips.created)
	}
	if len(acts.batch) != 1 || acts.batch[0].DayID != "day-1" {
		t.Errorf("activities = %+v", acts.batch)
	}

	if len(transports.created) != 1 {
		t.Fatalf("want the valid leg only, got %+v", transports.created)
	}
	tr := transports.created[0]
	wantDep := time.Date(2026, 11, 7, 4, 0, 0, 0, time.UTC)
	if tr.Type != transportation.TypeCar || !tr.DepartureDatetime.Equal(wantDep) || tr.Cost != nil {
		t.Errorf("transport = %+v (cost must stay nil: no expense)", tr)
	}
	if tr.Notes != "Lewat Tol Cipali.\nPerkiraan biaya: IDR 440.000" {
		t.Errorf("transport notes = %q", tr.Notes)
	}

	if len(stays.created) != 1 {
		t.Fatalf("stays = %+v", stays.created)
	}
	st := stays.created[0]
	if st.Name != "Mercure Convention Center Ancol" || st.CheckInTime != "18:00" || st.Lat == nil ||
		st.GooglePlaceID != "place-1" || st.Cost != nil || st.AccommodationType != accommodation.TypeHotel {
		t.Errorf("stay = %+v", st)
	}
	if st.Notes != "Perkiraan harga per malam: IDR 950.000" {
		t.Errorf("stay notes = %q", st.Notes)
	}
	if len(trips.deleted) != 0 {
		t.Error("a successful save must not delete the trip")
	}
}

func TestAutogenCreator_DeletesTripWhenABookingFails(t *testing.T) {
	trips := &fakeDraftTrips{}
	c := NewAutogenCreator(trips, &fakeDraftActivities{}, &fakeDraftTransports{err: errors.New("db down")}, &fakeDraftStays{})

	id, err := c.CreateFromDraft(context.Background(), "u1", fanMeetingDraft(), "2026-11-07", "2026-11-08", "", "")
	if err == nil || id != "" {
		t.Fatalf("want an error and no trip id, got %q, %v", id, err)
	}
	if len(trips.deleted) != 1 || trips.deleted[0] != "trip-1" {
		t.Errorf("half-made trip not deleted: %v", trips.deleted)
	}
}

func TestGroupThousands(t *testing.T) {
	for in, want := range map[float64]string{0: "0", 950: "950", 1000: "1.000", 2750000: "2.750.000"} {
		if got := groupThousands(in); got != want {
			t.Errorf("groupThousands(%v) = %q, want %q", in, got, want)
		}
	}
}
