//go:build integration

package integration

import (
	"net/http"
	"testing"
)

// TestSummary tests the AI trip summary endpoints.
// These tests require an LLM API key (OPENROUTER_API_KEY or DEEPSEEK_API_KEY).
func TestSummary(t *testing.T) {
	skipIfNoLLM(t)

	ctx := &TestContext{
		BaseURL:    globalCtx.BaseURL,
		Token:      globalCtx.Token,
		UserID:     globalCtx.UserID,
		HTTPClient: globalCtx.HTTPClient,
	}
	createTestTrip(t, ctx)
	defer deleteTestTrip(t, ctx)

	// Add some activities and expenses so the LLM has context for the summary
	dayID := ctx.DayIDs[0]

	t.Run("Setup: add activities for summary context", func(t *testing.T) {
		// Add a location activity
		resp := apiPost(t, ctx, "/days/"+dayID+"/activities", map[string]any{
			"type":       "location",
			"title":      "Tanah Lot Temple",
			"start_time": "09:00",
			"end_time":   "12:00",
			"payload": map[string]any{
				"location_name": "Tanah Lot, Bali",
				"lat":           -8.6213,
				"lng":           115.0868,
				"notes":         "Famous sea temple",
			},
		})
		assertStatus(t, resp, http.StatusCreated)
	})

	t.Run("Setup: add expenses for summary context", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/"+ctx.TripID+"/expenses", map[string]any{
			"title":    "Hotel",
			"amount":   2000000,
			"currency": "IDR",
			"category": "accommodation",
		})
		assertStatus(t, resp, http.StatusCreated)
	})

	t.Run("GET /trips/:id/summary returns 404 when no summary exists", func(t *testing.T) {
		resp := apiGet(t, ctx, "/trips/"+ctx.TripID+"/summary")
		assertStatusAny(t, resp, http.StatusNotFound, http.StatusTooManyRequests)
	})

	t.Run("POST /trips/:id/summary generates summary", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/"+ctx.TripID+"/summary", nil)
		// Can be 200 (success), 503 (LLM unavailable), or 429 (rate limited / general limit)
		assertStatusAny(t, resp, http.StatusOK, http.StatusServiceUnavailable, http.StatusTooManyRequests)

		if resp.StatusCode == http.StatusOK {
			body := parseMap(t, resp)
			if body["trip_id"] != ctx.TripID {
				t.Errorf("trip_id = %q, want %q", body["trip_id"], ctx.TripID)
			}
			content, ok := body["content"].(string)
			if !ok || content == "" {
				t.Error("expected non-empty content in summary")
			}
			model, ok := body["model"].(string)
			if !ok || model == "" {
				t.Error("expected non-empty model in summary")
			}
		} else if resp.StatusCode == http.StatusServiceUnavailable {
			t.Log("LLM unavailable, skipping summary assertion")
		} else if resp.StatusCode == http.StatusTooManyRequests {
			t.Log("Rate limited, skipping summary generation test")
		}
	})

	t.Run("GET /trips/:id/summary returns cached summary", func(t *testing.T) {
		resp := apiGet(t, ctx, "/trips/"+ctx.TripID+"/summary")
		assertStatusAny(t, resp, http.StatusOK, http.StatusNotFound, http.StatusTooManyRequests)

		if resp.StatusCode == http.StatusOK {
			body := parseMap(t, resp)
			if body["trip_id"] != ctx.TripID {
				t.Errorf("trip_id = %q, want %q", body["trip_id"], ctx.TripID)
			}
		} else if resp.StatusCode == http.StatusTooManyRequests {
			t.Log("Rate limited, skipping cached summary test")
		}
	})

	t.Run("DELETE /trips/:id/summary clears summary", func(t *testing.T) {
		resp := apiDelete(t, ctx, "/trips/"+ctx.TripID+"/summary")
		assertStatusAny(t, resp, http.StatusNoContent, http.StatusTooManyRequests)

		if resp.StatusCode == http.StatusNoContent {
			// Verify deletion
			getResp := apiGet(t, ctx, "/trips/"+ctx.TripID+"/summary")
			assertStatusAny(t, getResp, http.StatusNotFound, http.StatusTooManyRequests)
		} else if resp.StatusCode == http.StatusTooManyRequests {
			t.Log("Rate limited, skipping delete verification test")
		}
	})
}
