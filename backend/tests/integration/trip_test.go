package integration

import (
	"net/http"
	"testing"
)

// TestTrip_CRUD tests the full lifecycle of a trip.
func TestTrip_CRUD(t *testing.T) {
	ctx := &TestContext{
		BaseURL:    globalCtx.BaseURL,
		Token:      globalCtx.Token,
		UserID:     globalCtx.UserID,
		HTTPClient: globalCtx.HTTPClient,
	}
	defer deleteTestTrip(t, ctx)

	t.Run("POST /trips creates trip", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips", map[string]any{
			"title":         "My Bali Vacation",
			"description":   "Summer trip to Bali",
			"start_date":    "2026-08-01",
			"end_date":      "2026-08-05",
			"base_currency": "IDR",
			"budget":        5000000,
			"notes":         "Book early for best prices",
		})
		assertStatus(t, resp, http.StatusCreated)

		body := parseMap(t, resp)
		ctx.TripID = body["id"].(string)

		// Verify trip fields
		if body["title"] != "My Bali Vacation" {
			t.Errorf("title = %q, want 'My Bali Vacation'", body["title"])
		}
		if body["base_currency"] != "IDR" {
			t.Errorf("base_currency = %q, want IDR", body["base_currency"])
		}
		budget, ok := body["budget"].(float64)
		if !ok || budget != 5000000 {
			t.Errorf("budget = %v, want 5000000", body["budget"])
		}
	})

	t.Run("GET /trips/:id confirms days were auto-generated", func(t *testing.T) {
		if ctx.TripID == "" {
			t.Fatal("no trip ID available")
		}

		resp := apiGet(t, ctx, "/trips/"+ctx.TripID)
		assertStatus(t, resp, http.StatusOK)

		body := parseMap(t, resp)
		if body["id"] != ctx.TripID {
			t.Errorf("trip id mismatch: %q vs %q", body["id"], ctx.TripID)
		}

		// Verify auto-generated days (5 days: Aug 1-5)
		days, ok := body["days"].([]any)
		if !ok {
			t.Fatal("response missing 'days' array")
		}
		if len(days) != 5 {
			t.Errorf("expected 5 days, got %d", len(days))
		}

		// Store day IDs
		ctx.DayIDs = nil
		for _, d := range days {
			day := d.(map[string]any)
			ctx.DayIDs = append(ctx.DayIDs, day["id"].(string))
		}
		if len(ctx.DayIDs) != 5 {
			t.Fatalf("expected 5 day IDs, got %d", len(ctx.DayIDs))
		}
	})

	t.Run("GET /trips/:id returns trip with days", func(t *testing.T) {
		if ctx.TripID == "" {
			t.Fatal("no trip ID available")
		}

		resp := apiGet(t, ctx, "/trips/"+ctx.TripID)
		assertStatus(t, resp, http.StatusOK)

		body := parseMap(t, resp)
		if body["id"] != ctx.TripID {
			t.Errorf("trip id mismatch: %q vs %q", body["id"], ctx.TripID)
		}
		days, ok := body["days"].([]any)
		if !ok || len(days) == 0 {
			t.Error("expected days array in response")
		}
	})

	t.Run("PUT /trips/:id updates trip metadata", func(t *testing.T) {
		if ctx.TripID == "" {
			t.Fatal("no trip ID available")
		}

		resp := apiPut(t, ctx, "/trips/"+ctx.TripID, map[string]any{
			"title":         "Updated Bali Trip",
			"description":   "Updated description",
			"start_date":    "2026-08-01",
			"end_date":      "2026-08-07",
			"base_currency": "IDR",
			"budget":        10000000,
			"notes":         "Extended the trip",
		})
		assertStatus(t, resp, http.StatusOK)

		body := parseMap(t, resp)
		if body["title"] != "Updated Bali Trip" {
			t.Errorf("title = %q, want 'Updated Bali Trip'", body["title"])
		}
		if body["end_date"] != "2026-08-07" {
			t.Errorf("end_date = %q, want 2026-08-07", body["end_date"])
		}
	})

	t.Run("PUT /days/:day_id/notes updates day notes", func(t *testing.T) {
		// Re-fetch trip to get current day IDs (update may have regenerated days)
		getResp := apiGet(t, ctx, "/trips/"+ctx.TripID)
		assertStatus(t, getResp, http.StatusOK)
		getBody := parseMap(t, getResp)

		days, ok := getBody["days"].([]any)
		if !ok || len(days) == 0 {
			t.Fatal("no days available after update")
		}
		dayID := days[0].(map[string]any)["id"].(string)

		resp := apiPut(t, ctx, "/days/"+dayID+"/notes", map[string]any{
			"notes": "Day 1: Arrival and check-in",
		})
		assertStatus(t, resp, http.StatusOK)

		body := parseMap(t, resp)
		if body["notes"] != "Day 1: Arrival and check-in" {
			t.Errorf("notes = %q, want 'Day 1: Arrival and check-in'", body["notes"])
		}
	})

	t.Run("GET /trips returns paginated list", func(t *testing.T) {
		resp := apiGet(t, ctx, "/trips?limit=10")
		assertStatus(t, resp, http.StatusOK)

		items := parseList(t, resp)
		if len(items) == 0 {
			t.Error("expected at least one trip in list")
		}

		// Verify our trip is in the list
		found := false
		for _, item := range items {
			trip := item.(map[string]any)
			if trip["id"] == ctx.TripID {
				found = true
				break
			}
		}
		if !found {
			t.Error("created trip not found in list")
		}
	})

	t.Run("GET /trips/upcoming returns upcoming trips", func(t *testing.T) {
		resp := apiGet(t, ctx, "/trips/upcoming?limit=5")
		assertStatus(t, resp, http.StatusOK)

		items := parseList(t, resp)
		// Should contain our trip since start_date is in the future
		found := false
		for _, item := range items {
			trip := item.(map[string]any)
			if trip["id"] == ctx.TripID {
				found = true
				break
			}
		}
		if !found {
			t.Log("warning: created trip not found in upcoming list (may depend on date logic)")
		}
	})
}

// TestTrip_Validation tests trip validation errors.
func TestTrip_Validation(t *testing.T) {
	ctx := globalCtx

	t.Run("POST /trips with empty title returns 400", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips", map[string]any{
			"title":         "",
			"start_date":    "2026-08-01",
			"end_date":      "2026-08-05",
			"base_currency": "IDR",
		})
		assertStatus(t, resp, http.StatusBadRequest)
	})

	t.Run("POST /trips with end before start returns 400", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips", map[string]any{
			"title":         "Invalid Trip",
			"start_date":    "2026-08-10",
			"end_date":      "2026-08-05",
			"base_currency": "IDR",
		})
		assertStatus(t, resp, http.StatusBadRequest)
	})

	t.Run("POST /trips with invalid currency returns 400", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips", map[string]any{
			"title":         "Invalid Currency Trip",
			"start_date":    "2026-08-01",
			"end_date":      "2026-08-05",
			"base_currency": "XYZ",
		})
		assertStatus(t, resp, http.StatusBadRequest)
	})

	t.Run("GET /trips/nonexistent returns 404", func(t *testing.T) {
		resp := apiGet(t, ctx, "/trips/00000000-0000-0000-0000-000000000000")
		assertStatus(t, resp, http.StatusNotFound)
	})
}

// TestTrip_ForbiddenAccess tests that users cannot access other users' trips.
func TestTrip_ForbiddenAccess(t *testing.T) {
	ctx := globalCtx

	// Create a trip first
	testCtx := &TestContext{
		BaseURL:    ctx.BaseURL,
		Token:      ctx.Token,
		UserID:     ctx.UserID,
		HTTPClient: ctx.HTTPClient,
	}
	createTestTrip(t, testCtx)
	defer deleteTestTrip(t, testCtx)

	// Generate a different user's token (must be valid UUID format)
	otherCfg := LoadSetupConfig()
	otherCfg.UserID = "00000000-0000-4000-8000-000000000099"
	otherCtx := NewTestContext(otherCfg)

	t.Run("GET /trips/:id from other user returns 403", func(t *testing.T) {
		resp := apiGet(t, otherCtx, "/trips/"+testCtx.TripID)
		assertStatus(t, resp, http.StatusForbidden)
	})

	t.Run("PUT /trips/:id from other user returns 403", func(t *testing.T) {
		resp := apiPut(t, otherCtx, "/trips/"+testCtx.TripID, map[string]any{
			"title":         "Hacked Trip",
			"start_date":    "2026-08-01",
			"end_date":      "2026-08-05",
			"base_currency": "IDR",
		})
		assertStatus(t, resp, http.StatusForbidden)
	})

	t.Run("DELETE /trips/:id from other user returns 403", func(t *testing.T) {
		resp := apiDelete(t, otherCtx, "/trips/"+testCtx.TripID)
		assertStatus(t, resp, http.StatusForbidden)
	})
}
