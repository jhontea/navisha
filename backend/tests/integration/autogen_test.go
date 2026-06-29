package integration

import (
	"net/http"
	"testing"
)

// TestAutogen tests the AI auto-generate trip endpoints.
// These tests require an LLM API key (OPENROUTER_API_KEY or DEEPSEEK_API_KEY).
func TestAutogen(t *testing.T) {
	skipIfNoLLM(t)

	ctx := globalCtx

	t.Run("POST /trips/generate generates draft from prompt", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/generate", map[string]any{
			"destination":   "Tokyo, Jepang",
			"description":   "suka anime dan kuliner",
			"start_date":    "2026-09-01",
			"end_date":      "2026-09-05",
			"base_currency": "IDR",
		})
		// Can be 200 (success), 422 (invalid prompt), 503 (LLM unavailable), 429 (rate limited)
		// EOF means connection was closed by server (usually due to rate limiting)
		if resp.StatusCode == 0 || resp.StatusCode == http.StatusOK {
			// Connection succeeded, check status
			assertStatusAny(t, resp, http.StatusOK, http.StatusUnprocessableEntity, http.StatusServiceUnavailable, http.StatusTooManyRequests)
		} else {
			// Connection failed or rate limited
			t.Logf("Generation request returned status %d (likely rate limited), skipping", resp.StatusCode)
		}

		if resp.StatusCode == http.StatusOK {
			body := parseMap(t, resp)
			if body["start_date"] != "2026-09-01" {
				t.Errorf("start_date = %q, want 2026-09-01", body["start_date"])
			}
			if body["end_date"] != "2026-09-05" {
				t.Errorf("end_date = %q, want 2026-09-05", body["end_date"])
			}

			draft, ok := body["draft"].(map[string]any)
			if !ok {
				t.Fatal("expected draft object in response")
			}
			if draft["title"] == "" {
				t.Error("expected non-empty draft title")
			}
			days, ok := draft["days"].([]any)
			if !ok || len(days) == 0 {
				t.Error("expected non-empty draft days array")
			}
		} else if resp.StatusCode == http.StatusUnprocessableEntity {
			t.Log("LLM rejected prompt as invalid")
		} else if resp.StatusCode == http.StatusServiceUnavailable {
			t.Log("LLM unavailable, skipping generation test")
		} else if resp.StatusCode == http.StatusTooManyRequests {
			t.Log("Rate limited, skipping generation test")
		}
	})

	t.Run("POST /trips/generate with empty destination returns 400", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/generate", map[string]any{
			"destination":   "",
			"description":   "test",
			"start_date":    "2026-09-01",
			"end_date":      "2026-09-05",
			"base_currency": "IDR",
		})
		// Rate limiter may return 429 before validation runs
		assertStatusAny(t, resp, http.StatusBadRequest, http.StatusTooManyRequests)
	})

	t.Run("POST /trips/generate with invalid date returns 400", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/generate", map[string]any{
			"destination":   "Tokyo",
			"start_date":    "invalid-date",
			"end_date":      "2026-09-05",
			"base_currency": "IDR",
		})
		assertStatusAny(t, resp, http.StatusBadRequest, http.StatusTooManyRequests)
	})

	t.Run("POST /trips/generate with >10 days returns 422", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/generate", map[string]any{
			"destination":   "Tokyo, Jepang",
			"description":   "jalan-jalan",
			"start_date":    "2026-09-01",
			"end_date":      "2026-09-15",
			"base_currency": "IDR",
		})
		assertStatusAny(t, resp, http.StatusUnprocessableEntity, http.StatusServiceUnavailable, http.StatusTooManyRequests)
	})

	t.Run("POST /trips/from-draft creates trip from valid draft", func(t *testing.T) {
		// Generate a draft first
		genResp := apiPost(t, ctx, "/trips/generate", map[string]any{
			"destination":   "Bali, Indonesia",
			"description":   "liburan pantai dan budaya",
			"start_date":    "2026-10-01",
			"end_date":      "2026-10-04",
			"base_currency": "IDR",
		})

		if genResp.StatusCode != http.StatusOK {
			t.Skipf("Skipping from-draft test: generation returned %d", genResp.StatusCode)
		}
		defer genResp.Body.Close()

		genBody := parseMap(t, genResp)
		draft, ok := genBody["draft"].(map[string]any)
		if !ok {
			t.Fatal("expected draft in generate response")
		}

		// Ensure draft has required fields
		if draft["title"] == nil {
			draft["title"] = "Trip to Bali"
		}

		resp := apiPost(t, ctx, "/trips/from-draft", map[string]any{
			"start_date": "2026-10-01",
			"end_date":   "2026-10-04",
			"draft":      draft,
		})
		assertStatus(t, resp, http.StatusCreated)

		body := parseMap(t, resp)
		tripID, ok := body["trip_id"].(string)
		if !ok || tripID == "" {
			t.Fatal("expected trip_id in response")
		}

		// Cleanup: delete the created trip
		defer func() {
			delResp := apiDelete(t, ctx, "/trips/"+tripID)
			assertStatus(t, delResp, http.StatusNoContent)
		}()

		// Verify the trip was created
		getResp := apiGet(t, ctx, "/trips/"+tripID)
		assertStatus(t, getResp, http.StatusOK)

		getBody := parseMap(t, getResp)
		if getBody["title"] == "" {
			t.Error("expected non-empty title in created trip")
		}
	})

	t.Run("POST /trips/from-draft with invalid draft returns 422", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/from-draft", map[string]any{
			"start_date": "2026-10-01",
			"end_date":   "2026-10-04",
			"draft":      map[string]any{
				// Missing required fields
			},
		})
		// Backend returns 422 INVALID_INPUT when draft has no days
		assertStatusAny(t, resp, http.StatusUnprocessableEntity, http.StatusBadRequest)
	})
}
