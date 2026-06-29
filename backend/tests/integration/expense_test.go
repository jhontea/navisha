//go:build integration

package integration

import (
	"net/http"
	"testing"
)

// TestExpense_CRUD tests the full lifecycle of expenses including summary.
func TestExpense_CRUD(t *testing.T) {
	ctx := &TestContext{
		BaseURL:    globalCtx.BaseURL,
		Token:      globalCtx.Token,
		UserID:     globalCtx.UserID,
		HTTPClient: globalCtx.HTTPClient,
	}
	createTestTrip(t, ctx)
	defer deleteTestTrip(t, ctx)

	var expenseID1, expenseID2 string

	t.Run("POST /trips/:trip_id/expenses creates IDR expense", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/"+ctx.TripID+"/expenses", map[string]any{
			"title":    "Hotel Deposit",
			"amount":   500000,
			"currency": "IDR",
			"category": "accommodation",
			"note":     "Down payment for hotel booking",
		})
		assertStatus(t, resp, http.StatusCreated)

		body := parseMap(t, resp)
		expenseID1 = body["id"].(string)

		if body["title"] != "Hotel Deposit" {
			t.Errorf("title = %q, want 'Hotel Deposit'", body["title"])
		}
		if body["amount"] != float64(500000) {
			t.Errorf("amount = %v, want 500000", body["amount"])
		}
		if body["currency"] != "IDR" {
			t.Errorf("currency = %q, want IDR", body["currency"])
		}
		if body["category"] != "accommodation" {
			t.Errorf("category = %q, want accommodation", body["category"])
		}
		if body["base_currency"] != "IDR" {
			t.Errorf("base_currency = %q, want IDR", body["base_currency"])
		}
	})

	t.Run("POST /trips/:trip_id/expenses creates USD expense with auto-convert", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/"+ctx.TripID+"/expenses", map[string]any{
			"title":    "Flight Tickets",
			"amount":   350,
			"currency": "USD",
			"category": "transport",
			"note":     "Round trip tickets",
		})
		assertStatus(t, resp, http.StatusCreated)

		body := parseMap(t, resp)
		expenseID2 = body["id"].(string)

		if body["currency"] != "USD" {
			t.Errorf("currency = %q, want USD", body["currency"])
		}
		if body["base_currency"] != "IDR" {
			t.Errorf("base_currency = %q, want IDR (trip base)", body["base_currency"])
		}
		// converted_amount should be > 0 (USD 350 converted to IDR)
		converted, ok := body["converted_amount"].(float64)
		if !ok || converted <= 0 {
			t.Errorf("converted_amount = %v, want > 0", body["converted_amount"])
		}
	})

	t.Run("GET /trips/:trip_id/expenses lists all expenses", func(t *testing.T) {
		resp := apiGet(t, ctx, "/trips/"+ctx.TripID+"/expenses")
		assertStatus(t, resp, http.StatusOK)

		items := parseList(t, resp)
		if len(items) < 2 {
			t.Fatalf("expected at least 2 expenses, got %d", len(items))
		}
	})

	t.Run("GET /trips/:trip_id/expenses/summary returns category breakdown", func(t *testing.T) {
		resp := apiGet(t, ctx, "/trips/"+ctx.TripID+"/expenses/summary")
		assertStatus(t, resp, http.StatusOK)

		body := parseMap(t, resp)

		// Verify total_base > 0 and base_currency is IDR
		total, ok := body["total_base"].(float64)
		if !ok || total <= 0 {
			t.Errorf("total_base = %v, want > 0", body["total_base"])
		}
		if body["base_currency"] != "IDR" {
			t.Errorf("base_currency = %q, want IDR", body["base_currency"])
		}

		// Verify by_category contains our categories
		cats, ok := body["by_category"].([]any)
		if !ok || len(cats) == 0 {
			t.Fatal("expected non-empty by_category array")
		}

		foundAccommodation := false
		foundTransport := false
		for _, c := range cats {
			cat := c.(map[string]any)
			switch cat["category"] {
			case "accommodation":
				foundAccommodation = true
			case "transport":
				foundTransport = true
			}
		}
		if !foundAccommodation {
			t.Error("accommodation not found in summary categories")
		}
		if !foundTransport {
			t.Error("transport not found in summary categories")
		}
	})

	t.Run("PUT /expenses/:id updates expense", func(t *testing.T) {
		if expenseID1 == "" {
			t.Fatal("no expense ID")
		}

		resp := apiPut(t, ctx, "/expenses/"+expenseID1, map[string]any{
			"title":    "Hotel Full Payment",
			"amount":   1500000,
			"currency": "IDR",
			"category": "accommodation",
		})
		assertStatus(t, resp, http.StatusOK)

		body := parseMap(t, resp)
		if body["title"] != "Hotel Full Payment" {
			t.Errorf("title = %q, want 'Hotel Full Payment'", body["title"])
		}
		if body["amount"] != float64(1500000) {
			t.Errorf("amount = %v, want 1500000", body["amount"])
		}
	})

	t.Run("DELETE /expenses/:id deletes expense", func(t *testing.T) {
		if expenseID2 == "" {
			t.Fatal("no expense ID")
		}

		resp := apiDelete(t, ctx, "/expenses/"+expenseID2)
		assertStatus(t, resp, http.StatusNoContent)

		// Verify deletion
		resp = apiGet(t, ctx, "/trips/"+ctx.TripID+"/expenses")
		assertStatus(t, resp, http.StatusOK)
		items := parseList(t, resp)
		if len(items) != 1 {
			t.Errorf("expected 1 expense after delete, got %d", len(items))
		}
	})
}

// TestExpense_Validation tests expense validation errors.
func TestExpense_Validation(t *testing.T) {
	ctx := &TestContext{
		BaseURL:    globalCtx.BaseURL,
		Token:      globalCtx.Token,
		UserID:     globalCtx.UserID,
		HTTPClient: globalCtx.HTTPClient,
	}
	createTestTrip(t, ctx)
	defer deleteTestTrip(t, ctx)

	t.Run("POST with empty title returns 400", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/"+ctx.TripID+"/expenses", map[string]any{
			"title":    "",
			"amount":   10000,
			"currency": "IDR",
			"category": "food",
		})
		assertStatus(t, resp, http.StatusBadRequest)
	})

	t.Run("POST with zero amount returns 400", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/"+ctx.TripID+"/expenses", map[string]any{
			"title":    "Free Item",
			"amount":   0,
			"currency": "IDR",
			"category": "other",
		})
		assertStatus(t, resp, http.StatusBadRequest)
	})

	t.Run("POST with invalid currency returns error", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/"+ctx.TripID+"/expenses", map[string]any{
			"title":    "Invalid Currency",
			"amount":   100,
			"currency": "INVALID",
			"category": "food",
		})
		// Backend may return 400 or 500 for invalid currency
		assertStatusAny(t, resp, http.StatusBadRequest, http.StatusInternalServerError)
	})

	t.Run("POST with invalid category returns 400", func(t *testing.T) {
		resp := apiPost(t, ctx, "/trips/"+ctx.TripID+"/expenses", map[string]any{
			"title":    "Invalid Category",
			"amount":   10000,
			"currency": "IDR",
			"category": "invalid_category",
		})
		assertStatus(t, resp, http.StatusBadRequest)
	})

	t.Run("DELETE nonexistent expense returns 404", func(t *testing.T) {
		resp := apiDelete(t, ctx, "/expenses/00000000-0000-0000-0000-000000000000")
		assertStatus(t, resp, http.StatusNotFound)
	})
}
