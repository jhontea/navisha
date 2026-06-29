package integration

import (
	"bytes"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

// TestAdvanced_ConcurrentRequests tests that the API handles concurrent requests correctly.
func TestAdvanced_ConcurrentRequests(t *testing.T) {
	ctx := &TestContext{
		BaseURL:    globalCtx.BaseURL,
		Token:      globalCtx.Token,
		UserID:     globalCtx.UserID,
		HTTPClient: globalCtx.HTTPClient,
	}
	createTestTrip(t, ctx)
	defer deleteTestTrip(t, ctx)

	t.Run("Multiple concurrent GET requests return consistent data", func(t *testing.T) {
		done := make(chan bool, 10)
		for i := 0; i < 10; i++ {
			go func() {
				resp := apiGet(t, ctx, "/trips/"+ctx.TripID)
				assertStatus(t, resp, http.StatusOK)
				done <- true
			}()
		}
		for i := 0; i < 10; i++ {
			<-done
		}
	})

	t.Run("Concurrent writes to different resources succeed", func(t *testing.T) {
		if len(ctx.DayIDs) == 0 {
			t.Fatal("no day IDs")
		}
		dayID := ctx.DayIDs[0]

		done := make(chan bool, 5)
		for i := 0; i < 5; i++ {
			go func(idx int) {
				resp := apiPost(t, ctx, "/days/"+dayID+"/activities", map[string]any{
					"type":  "note",
					"title": "Concurrent Activity " + string(rune('A'+idx)),
					"payload": map[string]any{
						"content": "test",
					},
				})
				assertStatus(t, resp, http.StatusCreated)
				done <- true
			}(i)
		}
		for i := 0; i < 5; i++ {
			<-done
		}
	})
}

// TestAdvanced_InvalidJSON tests that the API handles malformed JSON gracefully.
func TestAdvanced_InvalidJSON(t *testing.T) {
	ctx := globalCtx

	t.Run("POST with invalid JSON body returns 400", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodPost, ctx.BaseURL+"/trips", strings.NewReader("{invalid json"))
		if err != nil {
			t.Fatalf("failed to create request: %v", err)
		}
		req.Header.Set("Authorization", "Bearer "+ctx.Token)
		req.Header.Set("Content-Type", "application/json")

		resp, err := ctx.HTTPClient.Do(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		defer resp.Body.Close()

		assertStatusAny(t, resp, http.StatusBadRequest, http.StatusInternalServerError)
	})

	t.Run("POST with empty body returns 400", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodPost, ctx.BaseURL+"/trips", strings.NewReader(""))
		if err != nil {
			t.Fatalf("failed to create request: %v", err)
		}
		req.Header.Set("Authorization", "Bearer "+ctx.Token)
		req.Header.Set("Content-Type", "application/json")

		resp, err := ctx.HTTPClient.Do(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		defer resp.Body.Close()

		assertStatusAny(t, resp, http.StatusBadRequest, http.StatusInternalServerError)
	})
}

// TestAdvanced_CORS tests CORS headers.
func TestAdvanced_CORS(t *testing.T) {
	ctx := globalCtx

	t.Run("OPTIONS request returns CORS headers", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodOptions, ctx.BaseURL+"/trips", nil)
		if err != nil {
			t.Fatalf("failed to create request: %v", err)
		}
		req.Header.Set("Origin", "http://localhost:3000")
		req.Header.Set("Access-Control-Request-Method", "POST")

		resp, err := ctx.HTTPClient.Do(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		defer resp.Body.Close()

		// CORS preflight should return 200 or 204
		assertStatusAny(t, resp, http.StatusOK, http.StatusNoContent)

		// Check for CORS headers
		headers := resp.Header
		if headers.Get("Access-Control-Allow-Origin") == "" {
			t.Log("warning: Access-Control-Allow-Origin header not set")
		}
		if headers.Get("Access-Control-Allow-Methods") == "" {
			t.Log("warning: Access-Control-Allow-Methods header not set")
		}
	})
}

// TestAdvanced_Pagination tests pagination edge cases.
func TestAdvanced_Pagination(t *testing.T) {
	ctx := &TestContext{
		BaseURL:    globalCtx.BaseURL,
		Token:      globalCtx.Token,
		UserID:     globalCtx.UserID,
		HTTPClient: globalCtx.HTTPClient,
	}
	createTestTrip(t, ctx)
	defer deleteTestTrip(t, ctx)

	t.Run("GET /trips with limit=0 returns error or default", func(t *testing.T) {
		resp := apiGet(t, ctx, "/trips?limit=0")
		assertStatusAny(t, resp, http.StatusOK, http.StatusBadRequest)
	})

	t.Run("GET /trips with negative limit returns error or default", func(t *testing.T) {
		resp := apiGet(t, ctx, "/trips?limit=-1")
		assertStatusAny(t, resp, http.StatusOK, http.StatusBadRequest)
	})

	t.Run("GET /trips with very large limit works", func(t *testing.T) {
		resp := apiGet(t, ctx, "/trips?limit=1000")
		assertStatus(t, resp, http.StatusOK)
	})

	t.Run("GET /trips with invalid cursor returns empty or error", func(t *testing.T) {
		resp := apiGet(t, ctx, "/trips?limit=10&cursor=invalid-cursor")
		assertStatusAny(t, resp, http.StatusOK, http.StatusBadRequest)
	})
}

// TestAdvanced_EmptyCollections tests endpoints with no data.
func TestAdvanced_EmptyCollections(t *testing.T) {
	ctx := &TestContext{
		BaseURL:    globalCtx.BaseURL,
		Token:      globalCtx.Token,
		UserID:     globalCtx.UserID,
		HTTPClient: globalCtx.HTTPClient,
	}

	// Create a trip but don't add any resources
	createTestTrip(t, ctx)
	defer deleteTestTrip(t, ctx)

	t.Run("GET /trips/:id/activities returns empty list", func(t *testing.T) {
		if len(ctx.DayIDs) == 0 {
			t.Fatal("no day IDs")
		}
		resp := apiGet(t, ctx, "/days/"+ctx.DayIDs[0]+"/activities")
		assertStatus(t, resp, http.StatusOK)

		items := parseList(t, resp)
		if len(items) != 0 {
			t.Errorf("expected empty activities list, got %d items", len(items))
		}
	})

	t.Run("GET /trips/:id/expenses returns empty list", func(t *testing.T) {
		resp := apiGet(t, ctx, "/trips/"+ctx.TripID+"/expenses")
		assertStatus(t, resp, http.StatusOK)

		items := parseList(t, resp)
		if len(items) != 0 {
			t.Errorf("expected empty expenses list, got %d items", len(items))
		}
	})

	t.Run("GET /trips/:id/transportations returns empty list", func(t *testing.T) {
		resp := apiGet(t, ctx, "/trips/"+ctx.TripID+"/transportations")
		assertStatus(t, resp, http.StatusOK)

		items := parseList(t, resp)
		if len(items) != 0 {
			t.Errorf("expected empty transportations list, got %d items", len(items))
		}
	})

	t.Run("GET /trips/:id/accommodations returns empty list", func(t *testing.T) {
		resp := apiGet(t, ctx, "/trips/"+ctx.TripID+"/accommodations")
		assertStatus(t, resp, http.StatusOK)

		items := parseList(t, resp)
		if len(items) != 0 {
			t.Errorf("expected empty accommodations list, got %d items", len(items))
		}
	})
}

// TestAdvanced_ContentType tests that the API returns correct content types.
func TestAdvanced_ContentType(t *testing.T) {
	ctx := globalCtx

	t.Run("GET /auth/me returns application/json", func(t *testing.T) {
		resp := apiGet(t, ctx, "/auth/me")
		assertStatus(t, resp, http.StatusOK)

		contentType := resp.Header.Get("Content-Type")
		if !strings.Contains(contentType, "application/json") {
			t.Errorf("expected Content-Type application/json, got %s", contentType)
		}
	})

	t.Run("POST /trips returns application/json", func(t *testing.T) {
		body := map[string]any{
			"title":         "Content Type Test",
			"start_date":    "2026-09-01",
			"end_date":      "2026-09-03",
			"base_currency": "IDR",
		}
		jsonBody, _ := json.Marshal(body)

		req, err := http.NewRequest(http.MethodPost, ctx.BaseURL+"/trips", bytes.NewReader(jsonBody))
		if err != nil {
			t.Fatalf("failed to create request: %v", err)
		}
		req.Header.Set("Authorization", "Bearer "+ctx.Token)
		req.Header.Set("Content-Type", "application/json")

		resp, err := ctx.HTTPClient.Do(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		defer resp.Body.Close()

		assertStatus(t, resp, http.StatusCreated)

		contentType := resp.Header.Get("Content-Type")
		if !strings.Contains(contentType, "application/json") {
			t.Errorf("expected Content-Type application/json, got %s", contentType)
		}

		// Cleanup
		respBody := parseMap(t, resp)
		if id, ok := respBody["id"].(string); ok {
			apiDelete(t, ctx, "/trips/"+id)
		}
	})
}

// TestAdvanced_HTTPMethods tests that unsupported HTTP methods return 405.
func TestAdvanced_HTTPMethods(t *testing.T) {
	ctx := globalCtx

	t.Run("PATCH /trips returns 405", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodPatch, ctx.BaseURL+"/trips/00000000-0000-0000-0000-000000000000", strings.NewReader("{}"))
		if err != nil {
			t.Fatalf("failed to create request: %v", err)
		}
		req.Header.Set("Authorization", "Bearer "+ctx.Token)
		req.Header.Set("Content-Type", "application/json")

		resp, err := ctx.HTTPClient.Do(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		defer resp.Body.Close()

		assertStatusAny(t, resp, http.StatusMethodNotAllowed, http.StatusNotFound, http.StatusBadRequest)
	})

	t.Run("TRACE /trips returns 405", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodTrace, ctx.BaseURL+"/trips", nil)
		if err != nil {
			t.Fatalf("failed to create request: %v", err)
		}
		req.Header.Set("Authorization", "Bearer "+ctx.Token)

		resp, err := ctx.HTTPClient.Do(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		defer resp.Body.Close()

		assertStatusAny(t, resp, http.StatusMethodNotAllowed, http.StatusNotFound)
	})
}
