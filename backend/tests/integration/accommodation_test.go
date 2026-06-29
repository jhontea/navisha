//go:build integration

package integration

import (
	"net/http"
	"testing"
)

// TestAccommodation_CRUD tests the full lifecycle of accommodations.
func TestAccommodation_CRUD(t *testing.T) {
	ctx := &TestContext{
		BaseURL:    globalCtx.BaseURL,
		Token:      globalCtx.Token,
		UserID:     globalCtx.UserID,
		HTTPClient: globalCtx.HTTPClient,
	}
	createTestTrip(t, ctx)
	defer deleteTestTrip(t, ctx)

	var accommodationID string

	t.Run("POST /trips/:trip_id/accommodations creates hotel", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/"+ctx.TripID+"/accommodations", map[string]any{
			"accommodation_type":  "hotel",
			"name":                "Four Seasons Bali",
			"location_name":       "Jimbaran, Bali",
			"lat":                 -8.7832,
			"lng":                 115.1637,
			"google_place_id":     "ChIJ123456",
			"check_in":            "2026-08-01",
			"check_out":           "2026-08-05",
			"confirmation_number": "FS-12345",
			"notes":               "Early check-in requested",
		})
		assertStatus(t, resp, http.StatusCreated)

		body := parseMap(t, resp)
		accommodationID = body["id"].(string)

		if body["name"] != "Four Seasons Bali" {
			t.Errorf("name = %q, want 'Four Seasons Bali'", body["name"])
		}
		if body["accommodation_type"] != "hotel" {
			t.Errorf("accommodation_type = %q, want 'hotel'", body["accommodation_type"])
		}
		if body["check_in"] != "2026-08-01" {
			t.Errorf("check_in = %q, want 2026-08-01", body["check_in"])
		}
		if body["check_out"] != "2026-08-05" {
			t.Errorf("check_out = %q, want 2026-08-05", body["check_out"])
		}
	})

	t.Run("POST /trips/:trip_id/accommodations creates hostel with cost", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/"+ctx.TripID+"/accommodations", map[string]any{
			"accommodation_type": "hostel",
			"name":               "Kuta Backpacker",
			"location_name":      "Kuta, Bali",
			"check_in":           "2026-08-05",
			"check_out":          "2026-08-07",
			"cost": map[string]any{
				"amount":   300000,
				"currency": "IDR",
			},
		})
		assertStatus(t, resp, http.StatusCreated)

		body := parseMap(t, resp)
		if body["accommodation_type"] != "hostel" {
			t.Errorf("accommodation_type = %q, want 'hostel'", body["accommodation_type"])
		}
	})

	t.Run("GET /trips/:trip_id/accommodations lists all", func(t *testing.T) {
		resp := apiGet(t, ctx, "/trips/"+ctx.TripID+"/accommodations")
		assertStatus(t, resp, http.StatusOK)

		items := parseList(t, resp)
		if len(items) < 2 {
			t.Fatalf("expected at least 2 accommodations, got %d", len(items))
		}
	})

	t.Run("PUT /accommodations/:id updates accommodation", func(t *testing.T) {
		if accommodationID == "" {
			t.Fatal("no accommodation ID")
		}

		resp := apiPut(t, ctx, "/accommodations/"+accommodationID, map[string]any{
			"accommodation_type":  "hotel",
			"name":                "Four Seasons Bali (Upgraded)",
			"location_name":       "Jimbaran, Bali",
			"check_in":            "2026-08-01",
			"check_out":           "2026-08-07",
			"confirmation_number": "FS-67890",
			"notes":               "Upgraded to suite",
		})
		assertStatus(t, resp, http.StatusOK)

		body := parseMap(t, resp)
		if body["name"] != "Four Seasons Bali (Upgraded)" {
			t.Errorf("name = %q, want 'Four Seasons Bali (Upgraded)'", body["name"])
		}
		if body["check_out"] != "2026-08-07" {
			t.Errorf("check_out = %q, want 2026-08-07", body["check_out"])
		}
	})

	t.Run("DELETE /accommodations/:id deletes accommodation", func(t *testing.T) {
		if accommodationID == "" {
			t.Fatal("no accommodation ID")
		}

		resp := apiDelete(t, ctx, "/accommodations/"+accommodationID)
		assertStatus(t, resp, http.StatusNoContent)

		// Verify deletion
		resp = apiGet(t, ctx, "/trips/"+ctx.TripID+"/accommodations")
		assertStatus(t, resp, http.StatusOK)
		items := parseList(t, resp)
		if len(items) != 1 {
			t.Errorf("expected 1 accommodation after delete, got %d", len(items))
		}
	})
}

// TestAccommodation_Validation tests accommodation validation errors.
func TestAccommodation_Validation(t *testing.T) {
	ctx := &TestContext{
		BaseURL:    globalCtx.BaseURL,
		Token:      globalCtx.Token,
		UserID:     globalCtx.UserID,
		HTTPClient: globalCtx.HTTPClient,
	}
	createTestTrip(t, ctx)
	defer deleteTestTrip(t, ctx)

	t.Run("POST with empty name returns 400", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/"+ctx.TripID+"/accommodations", map[string]any{
			"accommodation_type": "hotel",
			"name":               "",
			"check_in":           "2026-08-01",
			"check_out":          "2026-08-05",
		})
		assertStatus(t, resp, http.StatusBadRequest)
	})

	t.Run("POST with check_out before check_in returns 400", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/"+ctx.TripID+"/accommodations", map[string]any{
			"accommodation_type": "hotel",
			"name":               "Invalid Hotel",
			"check_in":           "2026-08-10",
			"check_out":          "2026-08-05",
		})
		assertStatus(t, resp, http.StatusBadRequest)
	})

	t.Run("POST with invalid type returns 400", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/"+ctx.TripID+"/accommodations", map[string]any{
			"accommodation_type": "castle",
			"name":               "Castle",
			"check_in":           "2026-08-01",
			"check_out":          "2026-08-05",
		})
		assertStatus(t, resp, http.StatusBadRequest)
	})

	t.Run("DELETE nonexistent accommodation returns 404", func(t *testing.T) {
		resp := apiDelete(t, ctx, "/accommodations/00000000-0000-0000-0000-000000000000")
		assertStatus(t, resp, http.StatusNotFound)
	})
}
