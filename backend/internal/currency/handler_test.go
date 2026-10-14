package currency

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
)

// stubRepo records calls so tests can assert what reached the rate source.
type stubRepo struct {
	rate     *Rate
	rateErr  error
	rates    []Rate
	ratesErr error

	rateCalls          int
	lastFrom, lastTo   string
	ratesCalls         int
	lastRatesBaseParam string
}

func (s *stubRepo) GetRate(_ context.Context, base, target string) (*Rate, error) {
	s.rateCalls++
	s.lastFrom, s.lastTo = base, target
	return s.rate, s.rateErr
}

func (s *stubRepo) GetRates(_ context.Context, base string) ([]Rate, error) {
	s.ratesCalls++
	s.lastRatesBaseParam = base
	return s.rates, s.ratesErr
}

// withSupported swaps the package-level supported list for the duration of a test.
func withSupported(t *testing.T, codes ...string) {
	t.Helper()
	prev := SupportedCurrencies
	SupportedCurrencies = codes
	UpdateSupportedSet()
	t.Cleanup(func() {
		SupportedCurrencies = prev
		UpdateSupportedSet()
	})
}

func doGet(t *testing.T, fn echo.HandlerFunc, query url.Values) (*httptest.ResponseRecorder, error) {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/?"+query.Encode(), nil)
	rec := httptest.NewRecorder()
	return rec, fn(echo.New().NewContext(req, rec))
}

func requireHTTPCode(t *testing.T, err error, want int) {
	t.Helper()
	var he *echo.HTTPError
	if !errors.As(err, &he) {
		t.Fatalf("err = %v, want *echo.HTTPError %d", err, want)
	}
	if he.Code != want {
		t.Fatalf("code = %d (%v), want %d", he.Code, he.Message, want)
	}
}

func decodeBody(t *testing.T, rec *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var out map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode %q: %v", rec.Body.String(), err)
	}
	return out
}

func TestHandler_Rates(t *testing.T) {
	fetched := time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC)
	tests := []struct {
		name     string
		base     string // "" = param omitted
		ratesErr error
		wantCode int
		wantBase string
	}{
		{"default base USD", "", nil, http.StatusOK, "USD"},
		{"explicit base", "IDR", nil, http.StatusOK, "IDR"},
		{"lowercase base normalized", "jpy", nil, http.StatusOK, "JPY"},
		{"unsupported base", "GBP", nil, http.StatusBadRequest, ""},
		{"garbage base", "x1", nil, http.StatusBadRequest, ""},
		{"repo unsupported", "USD", ErrUnsupported, http.StatusBadRequest, ""},
		{"repo failure", "USD", errors.New("upstream down"), http.StatusInternalServerError, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			withSupported(t, "IDR", "USD", "JPY")
			repo := &stubRepo{
				ratesErr: tt.ratesErr,
				rates: []Rate{
					{Base: tt.wantBase, Target: "IDR", Rate: 16000, FetchedAt: fetched},
					{Base: tt.wantBase, Target: "XXX", Rate: 2, FetchedAt: fetched},
				},
			}
			h := NewHandler(NewUsecase(repo))
			q := url.Values{}
			if tt.base != "" {
				q.Set("base", tt.base)
			}
			rec, err := doGet(t, h.Rates, q)
			if tt.wantCode != http.StatusOK {
				requireHTTPCode(t, err, tt.wantCode)
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if repo.lastRatesBaseParam != tt.wantBase {
				t.Errorf("repo base = %q, want %q", repo.lastRatesBaseParam, tt.wantBase)
			}
			body := decodeBody(t, rec)
			if body["base"] != tt.wantBase {
				t.Errorf("base = %v, want %v", body["base"], tt.wantBase)
			}
			items, _ := body["rates"].([]any)
			if len(items) != 2 {
				t.Fatalf("rates = %v", body["rates"])
			}
			first := items[0].(map[string]any)
			if first["currency"] != "IDR" || first["rate"] != 16000.0 || first["symbol"] != "Rp" ||
				first["fetched_at"] != "2026-10-01T00:00:00Z" {
				t.Errorf("rate item = %v", first)
			}
			// Unknown symbol renders as empty string rather than failing.
			if second := items[1].(map[string]any); second["symbol"] != "" {
				t.Errorf("unknown symbol = %v", second["symbol"])
			}
		})
	}
}

func TestHandler_Rates_EmptyIsArray(t *testing.T) {
	withSupported(t, "USD")
	h := NewHandler(NewUsecase(&stubRepo{}))
	rec, err := doGet(t, h.Rates, url.Values{})
	if err != nil {
		t.Fatal(err)
	}
	if items, ok := decodeBody(t, rec)["rates"].([]any); !ok || len(items) != 0 {
		t.Errorf("rates = %s, want []", rec.Body.String())
	}
}

func TestHandler_Convert_Validation(t *testing.T) {
	tests := []struct {
		name     string
		query    map[string]string
		wantCode int
	}{
		{"missing all", map[string]string{}, http.StatusBadRequest},
		{"missing from", map[string]string{"to": "IDR", "amount": "1"}, http.StatusBadRequest},
		{"missing to", map[string]string{"from": "USD", "amount": "1"}, http.StatusBadRequest},
		{"missing amount", map[string]string{"from": "USD", "to": "IDR"}, http.StatusBadRequest},
		{"non-numeric amount", map[string]string{"from": "USD", "to": "IDR", "amount": "ten"}, http.StatusBadRequest},
		{"comma decimal", map[string]string{"from": "USD", "to": "IDR", "amount": "1,5"}, http.StatusBadRequest},
		{"overflow amount", map[string]string{"from": "USD", "to": "IDR", "amount": "1e400"}, http.StatusBadRequest},
		{"zero amount", map[string]string{"from": "USD", "to": "IDR", "amount": "0"}, http.StatusBadRequest},
		{"negative amount", map[string]string{"from": "USD", "to": "IDR", "amount": "-5"}, http.StatusBadRequest},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &stubRepo{rate: &Rate{Rate: 1}}
			h := NewHandler(NewUsecase(repo))
			q := url.Values{}
			for k, v := range tt.query {
				q.Set(k, v)
			}
			_, err := doGet(t, h.Convert, q)
			requireHTTPCode(t, err, tt.wantCode)
			if repo.rateCalls != 0 {
				t.Errorf("repo called %d times for invalid input", repo.rateCalls)
			}
		})
	}
}

func TestHandler_Convert(t *testing.T) {
	tests := []struct {
		name     string
		from, to string
		amount   string
		rateErr  error
		wantCode int
	}{
		{"success", "USD", "IDR", "10", nil, http.StatusOK},
		{"lowercase normalized", "usd", "idr", "10", nil, http.StatusOK},
		{"fractional amount", "USD", "IDR", "0.5", nil, http.StatusOK},
		{"unsupported from repo", "USD", "XYZ", "10", ErrUnsupported, http.StatusBadRequest},
		{"wrapped unsupported", "USD", "XYZ", "10", errors.Join(errors.New("ctx"), ErrUnsupported), http.StatusBadRequest},
		{"upstream failure", "USD", "IDR", "10", errors.New("timeout"), http.StatusInternalServerError},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &stubRepo{rate: &Rate{Base: "USD", Target: "IDR", Rate: 16000}, rateErr: tt.rateErr}
			h := NewHandler(NewUsecase(repo))
			q := url.Values{"from": {tt.from}, "to": {tt.to}, "amount": {tt.amount}}
			rec, err := doGet(t, h.Convert, q)
			if tt.wantCode != http.StatusOK {
				requireHTTPCode(t, err, tt.wantCode)
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if repo.lastFrom != "USD" || repo.lastTo != "IDR" {
				t.Errorf("repo got %s→%s, want USD→IDR", repo.lastFrom, repo.lastTo)
			}
			body := decodeBody(t, rec)
			amt := body["amount"].(float64)
			if body["from"] != "USD" || body["to"] != "IDR" || body["rate"] != 16000.0 ||
				body["converted_amount"] != amt*16000 {
				t.Errorf("body = %v", body)
			}
		})
	}
}

// Documents current behaviour: Convert does not check from/to against the
// supported list itself; any 3-letter-ish code is forwarded to the rate
// source, which is the only thing that can reject it.
func TestHandler_Convert_DoesNotValidateCodesBeforeRepo(t *testing.T) {
	withSupported(t, "USD", "IDR")
	repo := &stubRepo{rate: &Rate{Rate: 2}}
	h := NewHandler(NewUsecase(repo))
	rec, err := doGet(t, h.Convert, url.Values{"from": {"abc"}, "to": {"zzz"}, "amount": {"1"}})
	if err != nil {
		t.Fatal(err)
	}
	if rec.Code != http.StatusOK || repo.lastFrom != "ABC" || repo.lastTo != "ZZZ" {
		t.Errorf("status=%d repo got %s→%s", rec.Code, repo.lastFrom, repo.lastTo)
	}
}

// "NaN" and "Inf" parse as floats; they are rejected before the rate source.
func TestHandler_Convert_NaNAndInf_400(t *testing.T) {
	for _, amt := range []string{"NaN", "Inf", "+Inf", "-Inf"} {
		t.Run(amt, func(t *testing.T) {
			repo := &stubRepo{rate: &Rate{Rate: 2}}
			h := NewHandler(NewUsecase(repo))
			_, err := doGet(t, h.Convert, url.Values{"from": {"USD"}, "to": {"IDR"}, "amount": {amt}})
			var he *echo.HTTPError
			if !errors.As(err, &he) || he.Code != http.StatusBadRequest {
				t.Fatalf("err = %v, want 400", err)
			}
			if repo.rateCalls != 0 {
				t.Errorf("repo calls = %d, want 0", repo.rateCalls)
			}
		})
	}
}

func TestHandler_Supported(t *testing.T) {
	withSupported(t, "IDR", "USD", "QQQ")
	h := NewHandler(NewUsecase(&stubRepo{}))
	rec, err := doGet(t, h.Supported, url.Values{})
	if err != nil {
		t.Fatal(err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
	items, _ := decodeBody(t, rec)["supported"].([]any)
	if len(items) != 3 {
		t.Fatalf("supported = %s", rec.Body.String())
	}
	want := []map[string]any{
		{"code": "IDR", "symbol": "Rp", "name": "Indonesian Rupiah"},
		{"code": "USD", "symbol": "$", "name": "US Dollar"},
		{"code": "QQQ", "symbol": "", "name": "QQQ"}, // unknown: name falls back to code
	}
	for i, w := range want {
		got := items[i].(map[string]any)
		for k, v := range w {
			if got[k] != v {
				t.Errorf("item %d %s = %v, want %v", i, k, got[k], v)
			}
		}
	}
}

func TestHandler_Supported_EmptyIsArray(t *testing.T) {
	withSupported(t)
	h := NewHandler(NewUsecase(&stubRepo{}))
	rec, err := doGet(t, h.Supported, url.Values{})
	if err != nil {
		t.Fatal(err)
	}
	if items, ok := decodeBody(t, rec)["supported"].([]any); !ok || len(items) != 0 {
		t.Errorf("supported = %s, want []", rec.Body.String())
	}
}
