//go:build integration

package integration

import (
	"net/http"
	"strings"
	"testing"
)

// TestCoverage_ErrorHandling tests various error scenarios.
func TestCoverage_ErrorHandling(t *testing.T) {
	ctx := &TestContext{
		BaseURL:    globalCtx.BaseURL,
		Token:      globalCtx.Token,
		UserID:     globalCtx.UserID,
		HTTPClient: globalCtx.HTTPClient,
	}
	createTestTrip(t, ctx)
	defer deleteTestTrip(t, ctx)

	t.Run("GET nonexistent trip returns 404", func(t *testing.T) {
		resp := apiGet(t, ctx, "/trips/00000000-0000-0000-0000-000000000000")
		assertStatus(t, resp, http.StatusNotFound)
	})

	t.Run("DELETE nonexistent trip returns 404", func(t *testing.T) {
		resp := apiDelete(t, ctx, "/trips/00000000-0000-0000-0000-000000000000")
		assertStatus(t, resp, http.StatusNotFound)
	})

	t.Run("PUT nonexistent trip returns 404 or 400", func(t *testing.T) {
		resp := apiPut(t, ctx, "/trips/00000000-0000-0000-0000-000000000000", map[string]any{
			"title": "Hacked",
		})
		// Backend may validate input (400) before checking existence (404)
		assertStatusAny(t, resp, http.StatusNotFound, http.StatusBadRequest)
	})

	if len(ctx.DayIDs) > 0 {
		dayID := ctx.DayIDs[0]

		t.Run("GET nonexistent day returns 404", func(t *testing.T) {
			resp := apiGet(t, ctx, "/days/00000000-0000-0000-0000-000000000000")
			assertStatus(t, resp, http.StatusNotFound)
		})

		t.Run("PUT nonexistent day notes returns 404", func(t *testing.T) {
			resp := apiPut(t, ctx, "/days/00000000-0000-0000-0000-000000000000/notes", map[string]any{
				"notes": "test",
			})
			assertStatus(t, resp, http.StatusNotFound)
		})

		t.Run("DELETE nonexistent activity returns 404", func(t *testing.T) {
			resp := apiDelete(t, ctx, "/days/"+dayID+"/activities/00000000-0000-0000-0000-000000000000")
			assertStatus(t, resp, http.StatusNotFound)
		})
	}

	t.Run("GET nonexistent expense returns 404", func(t *testing.T) {
		resp := apiGet(t, ctx, "/expenses/00000000-0000-0000-0000-000000000000")
		assertStatus(t, resp, http.StatusNotFound)
	})

	t.Run("PUT nonexistent expense returns 404 or 400", func(t *testing.T) {
		resp := apiPut(t, ctx, "/expenses/00000000-0000-0000-0000-000000000000", map[string]any{
			"title": "Hacked",
		})
		// Backend may validate input (400) before checking existence (404)
		assertStatusAny(t, resp, http.StatusNotFound, http.StatusBadRequest)
	})

	t.Run("DELETE nonexistent expense returns 404", func(t *testing.T) {
		resp := apiDelete(t, ctx, "/expenses/00000000-0000-0000-0000-000000000000")
		assertStatus(t, resp, http.StatusNotFound)
	})

	t.Run("GET nonexistent transportation returns 404", func(t *testing.T) {
		resp := apiGet(t, ctx, "/transportations/00000000-0000-0000-0000-000000000000")
		assertStatus(t, resp, http.StatusNotFound)
	})

	t.Run("DELETE nonexistent transportation returns 404", func(t *testing.T) {
		resp := apiDelete(t, ctx, "/transportations/00000000-0000-0000-0000-000000000000")
		assertStatus(t, resp, http.StatusNotFound)
	})

	t.Run("GET nonexistent accommodation returns 404", func(t *testing.T) {
		resp := apiGet(t, ctx, "/accommodations/00000000-0000-0000-0000-000000000000")
		assertStatus(t, resp, http.StatusNotFound)
	})

	t.Run("DELETE nonexistent accommodation returns 404", func(t *testing.T) {
		resp := apiDelete(t, ctx, "/accommodations/00000000-0000-0000-0000-000000000000")
		assertStatus(t, resp, http.StatusNotFound)
	})
}

// TestCoverage_DataIntegrity tests data consistency and integrity.
func TestCoverage_DataIntegrity(t *testing.T) {
	ctx := &TestContext{
		BaseURL:    globalCtx.BaseURL,
		Token:      globalCtx.Token,
		UserID:     globalCtx.UserID,
		HTTPClient: globalCtx.HTTPClient,
	}
	createTestTrip(t, ctx)
	defer deleteTestTrip(t, ctx)

	t.Run("Trip dates are preserved after creation", func(t *testing.T) {
		resp := apiGet(t, ctx, "/trips/"+ctx.TripID)
		assertStatus(t, resp, http.StatusOK)

		body := parseMap(t, resp)
		if body["start_date"] == nil || body["start_date"] == "" {
			t.Error("expected non-empty start_date")
		}
		if body["end_date"] == nil || body["end_date"] == "" {
			t.Error("expected non-empty end_date")
		}
	})

	t.Run("Days are sorted by date", func(t *testing.T) {
		resp := apiGet(t, ctx, "/trips/"+ctx.TripID)
		assertStatus(t, resp, http.StatusOK)

		body := parseMap(t, resp)
		days, ok := body["days"].([]any)
		if !ok || len(days) < 2 {
			t.Skip("trip has less than 2 days, skipping sort check")
		}

		// Verify days are in order
		for i := 0; i < len(days)-1; i++ {
			day1 := days[i].(map[string]any)
			day2 := days[i+1].(map[string]any)
			if day1["date"] == nil || day2["date"] == nil {
				continue
			}
			date1, _ := day1["date"].(string)
			date2, _ := day2["date"].(string)
			if date1 > date2 {
				t.Errorf("days not sorted: %s > %s at index %d", date1, date2, i)
			}
		}
	})

	t.Run("Activities maintain order after reorder", func(t *testing.T) {
		if len(ctx.DayIDs) == 0 {
			t.Fatal("no day IDs")
		}
		dayID := ctx.DayIDs[0]

		// Create 3 activities
		var ids []string
		for i := 0; i < 3; i++ {
			resp := apiPost(t, ctx, "/days/"+dayID+"/activities", map[string]any{
				"type":  "note",
				"title": "Activity " + string(rune('A'+i)),
				"payload": map[string]any{
					"content": "test",
				},
			})
			assertStatus(t, resp, http.StatusCreated)
			body := parseMap(t, resp)
			ids = append(ids, body["id"].(string))
		}

		// Reorder in reverse
		reordered := []string{ids[2], ids[1], ids[0]}
		resp := apiPut(t, ctx, "/days/"+dayID+"/activities/reorder", map[string]any{
			"ids": reordered,
		})
		assertStatusAny(t, resp, http.StatusOK, http.StatusNoContent)

		// Verify order
		resp = apiGet(t, ctx, "/days/"+dayID+"/activities")
		assertStatus(t, resp, http.StatusOK)
		list := parseList(t, resp)

		if len(list) >= 3 {
			first := list[0].(map[string]any)
			if first["id"] != reordered[0] {
				t.Errorf("first activity id = %q, want %q", first["id"], reordered[0])
			}
		}
	})
}

// TestCoverage_Permissions tests permission and authorization edge cases.
func TestCoverage_Permissions(t *testing.T) {
	ctx := globalCtx

	t.Run("Access without token returns 401", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, ctx.BaseURL+"/trips", nil)
		if err != nil {
			t.Fatalf("failed to create request: %v", err)
		}

		resp, err := ctx.HTTPClient.Do(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		defer resp.Body.Close()

		assertStatus(t, resp, http.StatusUnauthorized)
	})

	t.Run("Access with malformed token returns 401", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, ctx.BaseURL+"/trips", nil)
		if err != nil {
			t.Fatalf("failed to create request: %v", err)
		}
		req.Header.Set("Authorization", "Bearer malformed.token.here")

		resp, err := ctx.HTTPClient.Do(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		defer resp.Body.Close()

		assertStatus(t, resp, http.StatusUnauthorized)
	})

	t.Run("Access with empty token returns 401", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, ctx.BaseURL+"/trips", nil)
		if err != nil {
			t.Fatalf("failed to create request: %v", err)
		}
		req.Header.Set("Authorization", "Bearer ")

		resp, err := ctx.HTTPClient.Do(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		defer resp.Body.Close()

		assertStatus(t, resp, http.StatusUnauthorized)
	})
}

// TestCoverage_ResponseSchema tests that responses match expected schema.
func TestCoverage_ResponseSchema(t *testing.T) {
	ctx := &TestContext{
		BaseURL:    globalCtx.BaseURL,
		Token:      globalCtx.Token,
		UserID:     globalCtx.UserID,
		HTTPClient: globalCtx.HTTPClient,
	}
	createTestTrip(t, ctx)
	defer deleteTestTrip(t, ctx)

	t.Run("Trip response has required fields", func(t *testing.T) {
		resp := apiGet(t, ctx, "/trips/"+ctx.TripID)
		assertStatus(t, resp, http.StatusOK)

		body := parseMap(t, resp)
		requiredFields := []string{"id", "title", "start_date", "end_date", "base_currency", "days", "created_at", "updated_at"}
		for _, field := range requiredFields {
			if body[field] == nil {
				t.Errorf("trip response missing required field: %s", field)
			}
		}
	})

	t.Run("User response has required fields", func(t *testing.T) {
		resp := apiGet(t, ctx, "/auth/me")
		assertStatus(t, resp, http.StatusOK)

		body := parseMap(t, resp)
		requiredFields := []string{"id", "email", "name"}
		for _, field := range requiredFields {
			if body[field] == nil {
				t.Errorf("user response missing required field: %s", field)
			}
		}
		// created_at may or may not be present depending on implementation
		if body["created_at"] != nil {
			// Field exists, good
		}
	})

	if len(ctx.DayIDs) > 0 {
		dayID := ctx.DayIDs[0]

		t.Run("Activity response has required fields", func(t *testing.T) {
			resp := apiPost(t, ctx, "/days/"+dayID+"/activities", map[string]any{
				"type":  "note",
				"title": "Schema Test",
				"payload": map[string]any{
					"content": "test",
				},
			})
			assertStatus(t, resp, http.StatusCreated)

			body := parseMap(t, resp)
			requiredFields := []string{"id", "day_id", "type", "title", "order_index", "created_at"}
			for _, field := range requiredFields {
				if body[field] == nil {
					t.Errorf("activity response missing required field: %s", field)
				}
			}
		})
	}
}

// TestCoverage_BoundaryValues tests boundary values and limits.
func TestCoverage_BoundaryValues(t *testing.T) {
	ctx := &TestContext{
		BaseURL:    globalCtx.BaseURL,
		Token:      globalCtx.Token,
		UserID:     globalCtx.UserID,
		HTTPClient: globalCtx.HTTPClient,
	}
	createTestTrip(t, ctx)
	defer deleteTestTrip(t, ctx)

	t.Run("Expense with maximum allowed amount", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/"+ctx.TripID+"/expenses", map[string]any{
			"title":    "Max Amount",
			"amount":   9999999999.99,
			"currency": "IDR",
			"category": "other",
		})
		assertStatus(t, resp, http.StatusCreated)
	})

	t.Run("Expense with very small amount > 0", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/"+ctx.TripID+"/expenses", map[string]any{
			"title":    "Min Amount",
			"amount":   0.01,
			"currency": "IDR",
			"category": "other",
		})
		assertStatus(t, resp, http.StatusCreated)
	})

	if len(ctx.DayIDs) > 0 {
		dayID := ctx.DayIDs[0]

		t.Run("Activity with minimum payload", func(t *testing.T) {
			resp := apiPost(t, ctx, "/days/"+dayID+"/activities", map[string]any{
				"type":    "note",
				"title":   "Min",
				"payload": map[string]any{},
			})
			assertStatus(t, resp, http.StatusCreated)
		})

		t.Run("Activity with large payload", func(t *testing.T) {
			largePayload := make(map[string]any)
			for i := 0; i < 50; i++ {
				largePayload[string(rune('a'+i%26))] = strings.Repeat("x", 100)
			}

			resp := apiPost(t, ctx, "/days/"+dayID+"/activities", map[string]any{
				"type":    "note",
				"title":   "Large Payload",
				"payload": largePayload,
			})
			assertStatus(t, resp, http.StatusCreated)
		})
	}
}

// TestCoverage_SpecialCharacters tests handling of special characters in inputs.
func TestCoverage_SpecialCharacters(t *testing.T) {
	ctx := &TestContext{
		BaseURL:    globalCtx.BaseURL,
		Token:      globalCtx.Token,
		UserID:     globalCtx.UserID,
		HTTPClient: globalCtx.HTTPClient,
	}
	createTestTrip(t, ctx)
	defer deleteTestTrip(t, ctx)

	t.Run("Trip title with unicode characters", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips", map[string]any{
			"title":         "Trip to 日本 🇯🇵",
			"start_date":    "2026-09-01",
			"end_date":      "2026-09-03",
			"base_currency": "IDR",
		})
		defer func() {
			body := parseMap(t, resp)
			if id, ok := body["id"].(string); ok {
				apiDelete(t, ctx, "/trips/"+id)
			}
		}()
		assertStatus(t, resp, http.StatusCreated)
	})

	t.Run("Trip title with emojis", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips", map[string]any{
			"title":         "Beach Vacation 🏖️🌊☀️",
			"start_date":    "2026-09-01",
			"end_date":      "2026-09-03",
			"base_currency": "IDR",
		})
		defer func() {
			body := parseMap(t, resp)
			if id, ok := body["id"].(string); ok {
				apiDelete(t, ctx, "/trips/"+id)
			}
		}()
		assertStatus(t, resp, http.StatusCreated)
	})

	if len(ctx.DayIDs) > 0 {
		dayID := ctx.DayIDs[0]

		t.Run("Activity with special characters in title", func(t *testing.T) {
			resp := apiPost(t, ctx, "/days/"+dayID+"/activities", map[string]any{
				"type":    "note",
				"title":   "Test <script>alert('xss')</script>",
				"payload": map[string]any{"content": "test"},
			})
			assertStatus(t, resp, http.StatusCreated)
		})

		t.Run("Activity with SQL injection attempt in title", func(t *testing.T) {
			resp := apiPost(t, ctx, "/days/"+dayID+"/activities", map[string]any{
				"type":    "note",
				"title":   "'; DROP TABLE activities; --",
				"payload": map[string]any{"content": "test"},
			})
			assertStatus(t, resp, http.StatusCreated)
		})
	}
}
