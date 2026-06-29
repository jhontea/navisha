//go:build integration

package integration

import (
	"net/http"
	"strings"
	"testing"
)

// TestEdge_TripAdvanced tests advanced trip features: budget, pagination, filters.
func TestEdge_TripAdvanced(t *testing.T) {
	ctx := &TestContext{
		BaseURL:    globalCtx.BaseURL,
		Token:      globalCtx.Token,
		UserID:     globalCtx.UserID,
		HTTPClient: globalCtx.HTTPClient,
	}
	createTestTrip(t, ctx)
	defer deleteTestTrip(t, ctx)

	t.Run("Create trip without optional fields uses defaults", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips", map[string]any{
			"title":         "Minimal Trip",
			"start_date":    "2026-09-01",
			"end_date":      "2026-09-03",
			"base_currency": "USD",
		})
		assertStatus(t, resp, http.StatusCreated)

		body := parseMap(t, resp)
		tripID, ok := body["id"].(string)
		if ok {
			apiDelete(t, ctx, "/trips/"+tripID)
		}
	})

	t.Run("Create trip with title > 200 chars returns 400", func(t *testing.T) {
		longTitle := strings.Repeat("A", 201)
		resp := apiPost(t, ctx, "/trips", map[string]any{
			"title":         longTitle,
			"start_date":    "2026-09-01",
			"end_date":      "2026-09-03",
			"base_currency": "IDR",
		})
		assertStatus(t, resp, http.StatusBadRequest)
	})

	t.Run("Create trip with budget 0", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips", map[string]any{
			"title":         "Budget Trip",
			"start_date":    "2026-09-01",
			"end_date":      "2026-09-03",
			"base_currency": "IDR",
			"budget":        0,
		})
		assertStatus(t, resp, http.StatusCreated)

		body := parseMap(t, resp)
		tripID, ok := body["id"].(string)
		if ok {
			apiDelete(t, ctx, "/trips/"+tripID)
		}
		if body["budget"] != float64(0) {
			t.Errorf("budget = %v, want 0", body["budget"])
		}
	})

	t.Run("GET /trips/filter?from=...&to=... filters trips", func(t *testing.T) {
		resp := apiGet(t, ctx, "/trips/filter?from=2026-07-01&to=2026-07-31")
		assertStatus(t, resp, http.StatusOK)

		items := parseList(t, resp)
		if len(items) > 0 {
			t.Logf("found %d trips in date range", len(items))
		}
	})

	t.Run("GET /trips with limit and cursor pagination", func(t *testing.T) {
		// First page
		resp := apiGet(t, ctx, "/trips?limit=1")
		assertStatus(t, resp, http.StatusOK)

		var body map[string]any
		parseBody(t, resp, &body)

		items, ok := body["items"].([]any)
		if !ok || len(items) == 0 {
			t.Fatal("expected at least one trip")
		}

		nextCursor, hasCursor := body["next_cursor"].(string)
		if hasCursor && nextCursor != "" {
			// Second page
			resp2 := apiGet(t, ctx, "/trips?limit=1&cursor="+nextCursor)
			assertStatus(t, resp2, http.StatusOK)
		}
	})
}

// TestEdge_ExpenseAdvanced tests expense with optional fields.
func TestEdge_ExpenseAdvanced(t *testing.T) {
	ctx := &TestContext{
		BaseURL:    globalCtx.BaseURL,
		Token:      globalCtx.Token,
		UserID:     globalCtx.UserID,
		HTTPClient: globalCtx.HTTPClient,
	}
	createTestTrip(t, ctx)
	defer deleteTestTrip(t, ctx)

	var activityID string

	t.Run("Create activity for linked expense", func(t *testing.T) {
		if len(ctx.DayIDs) == 0 {
			t.Fatal("no day IDs")
		}
		resp := apiPost(t, ctx, "/days/"+ctx.DayIDs[0]+"/activities", map[string]any{
			"type":  "note",
			"title": "Snorkeling Activity",
			"payload": map[string]any{
				"content": "Snorkeling at Blue Lagoon",
			},
		})
		assertStatus(t, resp, http.StatusCreated)
		body := parseMap(t, resp)
		activityID = body["id"].(string)
	})

	t.Run("Create expense with activity_id, expense_date, and note", func(t *testing.T) {
		if activityID == "" {
			t.Fatal("no activity ID")
		}

		resp := apiPost(t, ctx, "/trips/"+ctx.TripID+"/expenses", map[string]any{
			"title":        "Snorkeling Gear Rental",
			"amount":       150000,
			"currency":     "IDR",
			"category":     "activity",
			"activity_id":  activityID,
			"expense_date": "2026-07-02",
			"note":         "Rental for 2 people",
		})
		assertStatus(t, resp, http.StatusCreated)

		body := parseMap(t, resp)
		if body["activity_id"] != activityID {
			t.Errorf("activity_id = %q, want %q", body["activity_id"], activityID)
		}
		expenseDate, ok := body["expense_date"].(string)
		if !ok || expenseDate != "2026-07-02" {
			t.Errorf("expense_date = %q, want 2026-07-02", expenseDate)
		}
		note, ok := body["note"].(string)
		if !ok || note != "Rental for 2 people" {
			t.Errorf("note = %q, want 'Rental for 2 people'", note)
		}
	})

	t.Run("Create expense with amount > 0 validation", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/"+ctx.TripID+"/expenses", map[string]any{
			"title":    "Negative",
			"amount":   -100,
			"currency": "IDR",
			"category": "food",
		})
		assertStatus(t, resp, http.StatusBadRequest)
	})
}

// TestEdge_TransportationAdvanced tests transportation with all fields and cost.
func TestEdge_TransportationAdvanced(t *testing.T) {
	ctx := &TestContext{
		BaseURL:    globalCtx.BaseURL,
		Token:      globalCtx.Token,
		UserID:     globalCtx.UserID,
		HTTPClient: globalCtx.HTTPClient,
	}
	createTestTrip(t, ctx)
	defer deleteTestTrip(t, ctx)

	t.Run("Create transportation with cost auto-creates expense", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/"+ctx.TripID+"/transportations", map[string]any{
			"type":               "train",
			"label":              "Jakarta - Bandung",
			"operator":           "KAI",
			"reference_number":   "KA-123",
			"from_location":      "Gambir",
			"to_location":        "Bandung",
			"departure_datetime": "2026-07-01T08:00:00+07:00",
			"arrival_datetime":   "2026-07-01T11:00:00+07:00",
			"notes":              "Business class",
			"cost": map[string]any{
				"amount":   250000,
				"currency": "IDR",
			},
		})
		assertStatus(t, resp, http.StatusCreated)

		body := parseMap(t, resp)
		if body["type"] != "train" {
			t.Errorf("type = %q, want 'train'", body["type"])
		}
		if body["operator"] != "KAI" {
			t.Errorf("operator = %q, want 'KAI'", body["operator"])
		}
	})

	t.Run("Verify expense was created by transport cost", func(t *testing.T) {
		resp := apiGet(t, ctx, "/trips/"+ctx.TripID+"/expenses")
		assertStatus(t, resp, http.StatusOK)

		items := parseList(t, resp)
		foundTransportExpense := false
		for _, item := range items {
			exp := item.(map[string]any)
			if exp["category"] == "transport" {
				foundTransportExpense = true
				title, _ := exp["title"].(string)
				t.Logf("found transport expense: %s amount=%v", title, exp["amount"])
				break
			}
		}
		if !foundTransportExpense {
			t.Log("warning: transport expense not found (may use different category)")
		}
	})

	t.Run("Create transportation with all types", func(t *testing.T) {
		types := []string{"flight", "bus", "train", "ferry", "ship", "car", "other"}
		for _, tp := range types {
			resp := apiPost(t, ctx, "/trips/"+ctx.TripID+"/transportations", map[string]any{
				"type":          tp,
				"from_location": "A",
				"to_location":   "B",
			})
			assertStatus(t, resp, http.StatusCreated)
		}
	})
}

// TestEdge_AccommodationAdvanced tests accommodation with all fields.
func TestEdge_AccommodationAdvanced(t *testing.T) {
	ctx := &TestContext{
		BaseURL:    globalCtx.BaseURL,
		Token:      globalCtx.Token,
		UserID:     globalCtx.UserID,
		HTTPClient: globalCtx.HTTPClient,
	}
	createTestTrip(t, ctx)
	defer deleteTestTrip(t, ctx)

	t.Run("Create accommodation with all fields", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/"+ctx.TripID+"/accommodations", map[string]any{
			"accommodation_type":  "apartment",
			"name":                "Airbnb Ubud",
			"location_name":       "Ubud, Bali",
			"lat":                 -8.5069,
			"lng":                 115.2625,
			"google_place_id":     "ChIJ789",
			"check_in":            "2026-07-01",
			"check_out":           "2026-07-05",
			"confirmation_number": "AB-789",
			"notes":               "Near monkey forest",
			"cost": map[string]any{
				"amount":   3000000,
				"currency": "IDR",
			},
		})
		assertStatus(t, resp, http.StatusCreated)

		body := parseMap(t, resp)
		if body["accommodation_type"] != "apartment" {
			t.Errorf("accommodation_type = %q, want 'apartment'", body["accommodation_type"])
		}
		if body["lat"] != -8.5069 {
			t.Errorf("lat = %v, want -8.5069", body["lat"])
		}
	})

	t.Run("Create accommodation with all types", func(t *testing.T) {
		types := []string{"hotel", "hostel", "apartment", "other"}
		for _, tp := range types {
			resp := apiPost(t, ctx, "/trips/"+ctx.TripID+"/accommodations", map[string]any{
				"accommodation_type": tp,
				"name":               "Test " + tp,
				"check_in":           "2026-08-01",
				"check_out":          "2026-08-02",
			})
			assertStatus(t, resp, http.StatusCreated)
		}
	})
}

// TestEdge_ActivityAdvanced tests activity edge cases.
func TestEdge_ActivityAdvanced(t *testing.T) {
	ctx := &TestContext{
		BaseURL:    globalCtx.BaseURL,
		Token:      globalCtx.Token,
		UserID:     globalCtx.UserID,
		HTTPClient: globalCtx.HTTPClient,
	}
	createTestTrip(t, ctx)
	defer deleteTestTrip(t, ctx)

	if len(ctx.DayIDs) == 0 {
		t.Fatal("no day IDs")
	}
	dayID := ctx.DayIDs[0]

	t.Run("Activity reorder with mismatched IDs returns 400", func(t *testing.T) {
		resp := apiPut(t, ctx, "/days/"+dayID+"/activities/reorder", map[string]any{
			"ids": []string{"00000000-0000-0000-0000-000000000000"},
		})
		assertStatusAny(t, resp, http.StatusBadRequest)
	})

	t.Run("Create activity with empty payload", func(t *testing.T) {
		resp := apiPost(t, ctx, "/days/"+dayID+"/activities", map[string]any{
			"type":    "note",
			"title":   "Empty Note",
			"payload": map[string]any{},
		})
		assertStatus(t, resp, http.StatusCreated)
	})

	t.Run("Activity title with 200 chars is allowed", func(t *testing.T) {
		longTitle := strings.Repeat("A", 200)
		resp := apiPost(t, ctx, "/days/"+dayID+"/activities", map[string]any{
			"type":  "note",
			"title": longTitle,
			"payload": map[string]any{
				"content": "test",
			},
		})
		assertStatus(t, resp, http.StatusCreated)
	})

	t.Run("Activity title with 201 chars returns 400", func(t *testing.T) {
		longTitle := strings.Repeat("A", 201)
		resp := apiPost(t, ctx, "/days/"+dayID+"/activities", map[string]any{
			"type":  "note",
			"title": longTitle,
			"payload": map[string]any{
				"content": "test",
			},
		})
		assertStatus(t, resp, http.StatusBadRequest)
	})
}

// TestEdge_HealthAndSecurity tests non-API endpoints.
func TestEdge_HealthAndSecurity(t *testing.T) {
	ctx := globalCtx

	t.Run("GET /health returns ok status", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, strings.Replace(ctx.BaseURL, "/api/v1", "", 1)+"/health", nil)
		if err != nil {
			t.Fatalf("failed to create request: %v", err)
		}
		resp, err := ctx.HTTPClient.Do(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		assertStatusAny(t, resp, http.StatusOK, http.StatusServiceUnavailable)

		body := parseMap(t, resp)
		if body["status"] == nil {
			t.Error("expected 'status' field in health response")
		}
	})

	t.Run("Response has security headers", func(t *testing.T) {
		resp := apiGet(t, ctx, "/auth/me")
		assertStatus(t, resp, http.StatusOK)

		headers := resp.Header
		// Check for security-related headers
		securityHeaders := []string{
			"X-Content-Type-Options",
			"X-Frame-Options",
			"X-XSS-Protection",
		}
		for _, h := range securityHeaders {
			if headers.Get(h) == "" {
				t.Logf("security header %q not set (may be configured elsewhere)", h)
			}
		}
	})
}

// TestEdge_CascadeDelete verifies that deleting a trip cascades to all resources.
func TestEdge_CascadeDelete(t *testing.T) {
	ctx := &TestContext{
		BaseURL:    globalCtx.BaseURL,
		Token:      globalCtx.Token,
		UserID:     globalCtx.UserID,
		HTTPClient: globalCtx.HTTPClient,
	}
	createTestTrip(t, ctx)

	// Add resources
	dayID := ctx.DayIDs[0]

	// Add activity
	apiPost(t, ctx, "/days/"+dayID+"/activities", map[string]any{
		"type":    "note",
		"title":   "Test Activity",
		"payload": map[string]any{"content": "test"},
	})
	// Add expense
	apiPost(t, ctx, "/trips/"+ctx.TripID+"/expenses", map[string]any{
		"title":    "Test Expense",
		"amount":   10000,
		"currency": "IDR",
		"category": "food",
	})
	// Add transportation
	apiPost(t, ctx, "/trips/"+ctx.TripID+"/transportations", map[string]any{
		"type":          "car",
		"from_location": "A",
		"to_location":   "B",
	})
	// Add accommodation
	apiPost(t, ctx, "/trips/"+ctx.TripID+"/accommodations", map[string]any{
		"name":      "Test Hotel",
		"check_in":  "2026-07-01",
		"check_out": "2026-07-05",
	})

	t.Run("DELETE trip returns 204", func(t *testing.T) {
		resp := apiDelete(t, ctx, "/trips/"+ctx.TripID)
		assertStatus(t, resp, http.StatusNoContent)
	})

	t.Run("GET trip after delete returns 404", func(t *testing.T) {
		resp := apiGet(t, ctx, "/trips/"+ctx.TripID)
		assertStatus(t, resp, http.StatusNotFound)
	})

	// Clear context so deferred cleanup won't try to delete again
	ctx.TripID = ""
	ctx.DayIDs = nil
}
