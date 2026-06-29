package integration

import (
	"net/http"
	"testing"
)

// TestTransportation_CRUD tests the full lifecycle of transportation.
func TestTransportation_CRUD(t *testing.T) {
	ctx := &TestContext{
		BaseURL:    globalCtx.BaseURL,
		Token:      globalCtx.Token,
		UserID:     globalCtx.UserID,
		HTTPClient: globalCtx.HTTPClient,
	}
	createTestTrip(t, ctx)
	defer deleteTestTrip(t, ctx)

	var transportID string

	t.Run("POST /trips/:trip_id/transportations creates flight", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/"+ctx.TripID+"/transportations", map[string]any{
			"type":               "flight",
			"label":              "Jakarta → Bali",
			"operator":           "Garuda Indonesia",
			"reference_number":   "GA-400",
			"from_location":      "CGK",
			"to_location":        "DPS",
			"departure_datetime": "2026-08-01T06:00:00Z",
			"arrival_datetime":   "2026-08-01T07:20:00Z",
			"notes":              "Check-in 2 hours before",
		})
		assertStatus(t, resp, http.StatusCreated)

		body := parseMap(t, resp)
		transportID = body["id"].(string)

		if body["type"] != "flight" {
			t.Errorf("type = %q, want 'flight'", body["type"])
		}
		if body["from_location"] != "CGK" {
			t.Errorf("from_location = %q, want CGK", body["from_location"])
		}
		if body["to_location"] != "DPS" {
			t.Errorf("to_location = %q, want DPS", body["to_location"])
		}
		if body["operator"] != "Garuda Indonesia" {
			t.Errorf("operator = %q, want 'Garuda Indonesia'", body["operator"])
		}
	})

	t.Run("POST /trips/:trip_id/transportations creates bus with cost", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/"+ctx.TripID+"/transportations", map[string]any{
			"type":          "bus",
			"label":         "Airport Shuttle",
			"from_location": "DPS Airport",
			"to_location":   "Kuta",
			"notes":         "Shared shuttle",
			"cost": map[string]any{
				"amount":   150000,
				"currency": "IDR",
			},
		})
		assertStatus(t, resp, http.StatusCreated)

		body := parseMap(t, resp)
		if body["type"] != "bus" {
			t.Errorf("type = %q, want 'bus'", body["type"])
		}
	})

	t.Run("GET /trips/:trip_id/transportations lists all", func(t *testing.T) {
		resp := apiGet(t, ctx, "/trips/"+ctx.TripID+"/transportations")
		assertStatus(t, resp, http.StatusOK)

		items := parseList(t, resp)
		if len(items) < 2 {
			t.Fatalf("expected at least 2 transportations, got %d", len(items))
		}
	})

	t.Run("PUT /transportations/:id updates transportation", func(t *testing.T) {
		if transportID == "" {
			t.Fatal("no transport ID")
		}

		resp := apiPut(t, ctx, "/transportations/"+transportID, map[string]any{
			"type":               "flight",
			"label":              "Jakarta → Bali (Updated)",
			"operator":           "Batik Air",
			"reference_number":   "ID-6502",
			"from_location":      "CGK",
			"to_location":        "DPS",
			"departure_datetime": "2026-08-01T08:00:00Z",
			"arrival_datetime":   "2026-08-01T09:20:00Z",
			"notes":              "Rescheduled",
		})
		assertStatus(t, resp, http.StatusOK)

		body := parseMap(t, resp)
		if body["operator"] != "Batik Air" {
			t.Errorf("operator = %q, want 'Batik Air'", body["operator"])
		}
		if body["reference_number"] != "ID-6502" {
			t.Errorf("reference_number = %q, want 'ID-6502'", body["reference_number"])
		}
	})

	t.Run("DELETE /transportations/:id deletes transportation", func(t *testing.T) {
		if transportID == "" {
			t.Fatal("no transport ID")
		}

		resp := apiDelete(t, ctx, "/transportations/"+transportID)
		assertStatus(t, resp, http.StatusNoContent)

		// Verify deletion
		resp = apiGet(t, ctx, "/trips/"+ctx.TripID+"/transportations")
		assertStatus(t, resp, http.StatusOK)
		items := parseList(t, resp)
		if len(items) != 1 {
			t.Errorf("expected 1 transportation after delete, got %d", len(items))
		}
	})
}

// TestTransportation_Validation tests transportation validation errors.
func TestTransportation_Validation(t *testing.T) {
	ctx := &TestContext{
		BaseURL:    globalCtx.BaseURL,
		Token:      globalCtx.Token,
		UserID:     globalCtx.UserID,
		HTTPClient: globalCtx.HTTPClient,
	}
	createTestTrip(t, ctx)
	defer deleteTestTrip(t, ctx)

	t.Run("POST with empty from_location returns 400", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/"+ctx.TripID+"/transportations", map[string]any{
			"type":          "flight",
			"from_location": "",
			"to_location":   "DPS",
		})
		assertStatus(t, resp, http.StatusBadRequest)
	})

	t.Run("POST with empty to_location returns 400", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/"+ctx.TripID+"/transportations", map[string]any{
			"type":          "flight",
			"from_location": "CGK",
			"to_location":   "",
		})
		assertStatus(t, resp, http.StatusBadRequest)
	})

	t.Run("POST with invalid type returns 400", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/"+ctx.TripID+"/transportations", map[string]any{
			"type":          "rocket",
			"from_location": "CGK",
			"to_location":   "DPS",
		})
		assertStatus(t, resp, http.StatusBadRequest)
	})

	t.Run("DELETE nonexistent transportation returns 404", func(t *testing.T) {
		resp := apiDelete(t, ctx, "/transportations/00000000-0000-0000-0000-000000000000")
		assertStatus(t, resp, http.StatusNotFound)
	})
}
