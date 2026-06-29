package integration

import (
	"net/http"
	"testing"
)

// TestCurrency tests the read-only currency endpoints.
func TestCurrency(t *testing.T) {
	ctx := globalCtx

	t.Run("GET /currency/supported returns currency list", func(t *testing.T) {
		resp := apiGet(t, ctx, "/currency/supported")
		assertStatus(t, resp, http.StatusOK)

		body := parseMap(t, resp)
		supported, ok := body["supported"].([]any)
		if !ok || len(supported) == 0 {
			t.Fatal("expected non-empty supported currencies list")
		}

		// Find IDR in the list
		foundIDR := false
		for _, c := range supported {
			curr := c.(map[string]any)
			if curr["code"] == "IDR" {
				foundIDR = true
				if curr["symbol"] != "Rp" {
					t.Errorf("IDR symbol = %q, want 'Rp'", curr["symbol"])
				}
				break
			}
		}
		if !foundIDR {
			t.Error("IDR not found in supported currencies")
		}
	})

	t.Run("GET /currency/rates?base=IDR returns rates", func(t *testing.T) {
		resp := apiGet(t, ctx, "/currency/rates?base=IDR")
		assertStatus(t, resp, http.StatusOK)

		body := parseMap(t, resp)
		if body["base"] != "IDR" {
			t.Errorf("base = %q, want IDR", body["base"])
		}

		rates, ok := body["rates"].([]any)
		if !ok || len(rates) == 0 {
			t.Fatal("expected non-empty rates list")
		}

		// IDR should have rate 1.0
		for _, r := range rates {
			rate := r.(map[string]any)
			if rate["currency"] == "IDR" {
				if rate["rate"] != float64(1) {
					t.Errorf("IDR rate = %v, want 1.0", rate["rate"])
				}
				break
			}
		}
	})

	t.Run("GET /currency/convert converts USD to IDR", func(t *testing.T) {
		resp := apiGet(t, ctx, "/currency/convert?from=USD&to=IDR&amount=100")
		assertStatus(t, resp, http.StatusOK)

		body := parseMap(t, resp)
		if body["from"] != "USD" {
			t.Errorf("from = %q, want USD", body["from"])
		}
		if body["to"] != "IDR" {
			t.Errorf("to = %q, want IDR", body["to"])
		}
		if body["amount"] != float64(100) {
			t.Errorf("amount = %v, want 100", body["amount"])
		}

		converted, ok := body["converted_amount"].(float64)
		if !ok || converted <= 0 {
			t.Errorf("converted_amount = %v, want > 0", body["converted_amount"])
		}

		rate, ok := body["rate"].(float64)
		if !ok || rate <= 0 {
			t.Errorf("rate = %v, want > 0", body["rate"])
		}
	})

	t.Run("GET /currency/convert with invalid currency returns 400", func(t *testing.T) {
		resp := apiGet(t, ctx, "/currency/convert?from=INVALID&to=IDR&amount=100")
		assertStatus(t, resp, http.StatusBadRequest)
	})

	t.Run("GET /currency/rates with invalid base returns 400", func(t *testing.T) {
		resp := apiGet(t, ctx, "/currency/rates?base=INVALID")
		assertStatus(t, resp, http.StatusBadRequest)
	})
}
