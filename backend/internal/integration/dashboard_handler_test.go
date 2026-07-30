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

type dashboardTripStub struct {
	trip.UsecaseInterface
	upcoming []trip.Trip
	listed   trip.ListResult
}

func (s dashboardTripStub) ListUpcoming(context.Context, string, int) ([]trip.Trip, error) {
	return s.upcoming, nil
}

func (s dashboardTripStub) List(context.Context, string, string, int) (trip.ListResult, error) {
	return s.listed, nil
}

func TestDashboardResponsePreservesTripPayloads(t *testing.T) {
	now := time.Date(2026, time.July, 30, 0, 0, 0, 0, time.UTC)
	item := trip.Trip{ID: "trip-1", UserID: "user-1", Title: "Tokyo", StartDate: now, EndDate: now, BaseCurrency: "JPY"}
	handler := NewDashboardHandler(dashboardTripStub{
		upcoming: []trip.Trip{item},
		listed:   trip.ListResult{Trips: []trip.Trip{item}, NextCursor: "next"},
	})

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/dashboard", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.Set(middleware.UserIDKey, "user-1")

	if err := handler.Get(c); err != nil {
		t.Fatalf("Get returned error: %v", err)
	}
	var response struct {
		Upcoming struct {
			Items []map[string]any `json:"items"`
		} `json:"upcoming"`
		Trips struct {
			Items      []map[string]any `json:"items"`
			NextCursor string           `json:"next_cursor"`
		} `json:"trips"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if rec.Code != http.StatusOK || len(response.Upcoming.Items) != 1 || len(response.Trips.Items) != 1 {
		t.Fatalf("unexpected dashboard response: status=%d body=%s", rec.Code, rec.Body.String())
	}
	if response.Upcoming.Items[0]["start_date"] != "2026-07-30" || response.Trips.NextCursor != "next" {
		t.Fatalf("dashboard payload changed existing trip contract: %s", rec.Body.String())
	}
}
