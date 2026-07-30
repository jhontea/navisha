package integration

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/ahmadhafizh/navisha/backend/internal/middleware"
	"github.com/ahmadhafizh/navisha/backend/internal/trip"
	"github.com/labstack/echo/v4"
)

type overviewTripStub struct {
	trip.UsecaseInterface
	trip *trip.Trip
	days []trip.Day
}

func (s overviewTripStub) Get(context.Context, string, string) (*trip.Trip, []trip.Day, error) {
	return s.trip, s.days, nil
}

type overviewReaderStub struct {
	stats *TripOverviewStats
}

func (s overviewReaderStub) Stats(context.Context, string) (*TripOverviewStats, error) {
	return s.stats, nil
}

func TestTripOverviewCompactResponseAndETag(t *testing.T) {
	now := time.Date(2026, time.July, 29, 0, 0, 0, 0, time.UTC)
	tripItem := &trip.Trip{
		ID: "trip-1", UserID: "user-1", Title: "Tokyo", StartDate: now,
		EndDate: now.AddDate(0, 0, 1), BaseCurrency: "JPY",
	}
	days := []trip.Day{{ID: "day-1", TripID: "trip-1", Date: now, DayNumber: 1}}
	handler := NewTripOverviewHandler(
		overviewTripStub{trip: tripItem, days: days},
		overviewReaderStub{stats: &TripOverviewStats{
			ActivityCountByDay: map[string]int{"day-1": 3}, AccommodationCount: 1,
			TransportationCount: 2, ExpenseTotal: 1200,
			ExpenseByCategory: map[string]float64{"food": 1200},
		}},
	)

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/trips/trip-1/overview", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("trip_id")
	c.SetParamValues("trip-1")
	c.Set(middleware.UserIDKey, "user-1")

	if err := handler.Get(c); err != nil {
		t.Fatalf("Get returned error: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if rec.Header().Get("ETag") == "" {
		t.Fatal("ETag header is missing")
	}
	var response map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if _, exists := response["activities"]; exists {
		t.Fatal("compact response unexpectedly contains full activities")
	}
	if got := response["accommodation_count"]; got != float64(1) {
		t.Fatalf("accommodation_count = %v, want 1", got)
	}

	conditionalReq := httptest.NewRequest(http.MethodGet, "/api/v1/trips/trip-1/overview", nil)
	conditionalReq.Header.Set("If-None-Match", rec.Header().Get("ETag"))
	conditionalRec := httptest.NewRecorder()
	conditionalContext := e.NewContext(conditionalReq, conditionalRec)
	conditionalContext.SetParamNames("trip_id")
	conditionalContext.SetParamValues("trip-1")
	conditionalContext.Set(middleware.UserIDKey, "user-1")
	if err := handler.Get(conditionalContext); err != nil {
		t.Fatalf("conditional Get returned error: %v", err)
	}
	if conditionalRec.Code != http.StatusNotModified {
		t.Fatalf("conditional status = %d, want %d", conditionalRec.Code, http.StatusNotModified)
	}
}
