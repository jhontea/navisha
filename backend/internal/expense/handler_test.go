package expense

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/ahmadhafizh/navisha/backend/internal/apperr"
	"github.com/ahmadhafizh/navisha/backend/internal/middleware"
	"github.com/labstack/echo/v4"
)

const handlerTestUser = "user-1"

// callHandler runs fn through middleware.WithUser, as the router does.
// An empty userID leaves the user context unset (→ 401).
func callHandler(
	t *testing.T,
	fn func(echo.Context, string) error,
	method, body, userID string,
	params map[string]string,
) (*httptest.ResponseRecorder, error) {
	t.Helper()
	req := httptest.NewRequest(method, "/", strings.NewReader(body))
	if body != "" {
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	}
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)
	names := make([]string, 0, len(params))
	values := make([]string, 0, len(params))
	for k, v := range params {
		names = append(names, k)
		values = append(values, v)
	}
	c.SetParamNames(names...)
	c.SetParamValues(values...)
	if userID != "" {
		c.Set(middleware.UserIDKey, userID)
	}
	return rec, middleware.WithUser(fn)(c)
}

// statusOf returns the HTTP status the request resolves to: the recorder's
// code on success, or the *echo.HTTPError code on failure.
func statusOf(t *testing.T, rec *httptest.ResponseRecorder, err error) int {
	t.Helper()
	if err == nil {
		return rec.Code
	}
	var he *echo.HTTPError
	if !errors.As(err, &he) {
		t.Fatalf("error is not *echo.HTTPError: %v", err)
	}
	return he.Code
}

func decodeBody(t *testing.T, rec *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var out map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode body %q: %v", rec.Body.String(), err)
	}
	return out
}

// seededRepo: trip-1 (base IDR) owned by user-1, trip-2 owned by someone
// else; exp-1 belongs to trip-1, exp-2 to trip-2.
func seededRepo() *mockRepo {
	r := newMockRepo()
	r.trips["trip-1"] = tripMeta{owner: handlerTestUser, base: "IDR"}
	r.trips["trip-2"] = tripMeta{owner: "other-user", base: "USD"}
	r.expenses["exp-1"] = &Expense{
		ID: "exp-1", TripID: "trip-1", Title: "Old", Amount: 1, Currency: "IDR",
		Category: CategoryFood, ExpenseDate: time.Date(2026, 1, 2, 0, 0, 0, 0, time.UTC),
	}
	r.expenseOf["exp-1"] = "trip-1"
	r.expenses["exp-2"] = &Expense{ID: "exp-2", TripID: "trip-2", Title: "Not mine"}
	r.expenseOf["exp-2"] = "trip-2"
	return r
}

func newTestHandler(repo *mockRepo, conv *mockConverter) *Handler {
	if conv == nil {
		conv = &mockConverter{rate: 15000}
	}
	return NewHandler(NewUsecase(repo, conv))
}

func TestHandler_MissingUser_Returns401(t *testing.T) {
	h := newTestHandler(seededRepo(), nil)
	handlers := map[string]func(echo.Context, string) error{
		"List": h.List, "Create": h.Create, "Update": h.Update, "Delete": h.Delete, "Summary": h.Summary,
	}
	for name, fn := range handlers {
		t.Run(name, func(t *testing.T) {
			rec, err := callHandler(t, fn, http.MethodPost, `{}`, "", map[string]string{"trip_id": "trip-1", "id": "exp-1"})
			if got := statusOf(t, rec, err); got != http.StatusUnauthorized {
				t.Errorf("status = %d, want 401", got)
			}
		})
	}
}

func TestHandler_Create(t *testing.T) {
	valid := func(overrides string) string {
		// overrides is spliced in after the defaults; later JSON keys win.
		base := `"title":"Lunch","amount":10,"currency":"usd","category":"food"`
		if overrides == "" {
			return "{" + base + "}"
		}
		return "{" + base + "," + overrides + "}"
	}
	tests := []struct {
		name   string
		tripID string
		body   string
		conv   *mockConverter
		want   int
		verify func(t *testing.T, body map[string]any)
	}{
		{name: "malformed json", tripID: "trip-1", body: `{"title":`, want: http.StatusBadRequest},
		{name: "amount as string", tripID: "trip-1", body: valid(`"amount":"10"`), want: http.StatusBadRequest},
		{name: "missing title", tripID: "trip-1", body: `{"amount":10,"currency":"USD","category":"food"}`, want: http.StatusBadRequest},
		{name: "whitespace title", tripID: "trip-1", body: valid(`"title":"  "`), want: http.StatusBadRequest},
		{name: "zero amount", tripID: "trip-1", body: valid(`"amount":0`), want: http.StatusBadRequest},
		{name: "negative amount", tripID: "trip-1", body: valid(`"amount":-5`), want: http.StatusBadRequest},
		{name: "missing currency", tripID: "trip-1", body: `{"title":"x","amount":1,"category":"food"}`, want: http.StatusBadRequest},
		{name: "whitespace currency", tripID: "trip-1", body: valid(`"currency":"   "`), want: http.StatusBadRequest},
		{name: "title too long", tripID: "trip-1", body: valid(`"title":"` + strings.Repeat("a", 201) + `"`), want: http.StatusBadRequest},
		{name: "note too long", tripID: "trip-1", body: valid(`"note":"` + strings.Repeat("n", 2001) + `"`), want: http.StatusBadRequest},
		{name: "invalid category", tripID: "trip-1", body: valid(`"category":"bogus"`), want: http.StatusBadRequest},
		{name: "missing category", tripID: "trip-1", body: `{"title":"x","amount":1,"currency":"USD"}`, want: http.StatusBadRequest},
		{name: "trip not found", tripID: "missing", body: valid(""), want: http.StatusNotFound},
		{name: "trip owned by other user", tripID: "trip-2", body: valid(""), want: http.StatusForbidden},
		{name: "html-only title is empty", tripID: "trip-1", body: valid(`"title":"<b></b>"`), want: http.StatusBadRequest},
		{name: "bad expense_date", tripID: "trip-1", body: valid(`"expense_date":"02/01/2026"`), want: http.StatusBadRequest},
		{name: "rates unavailable", tripID: "trip-1", body: valid(""), conv: &mockConverter{err: errors.New("rates down")}, want: http.StatusServiceUnavailable},
		{name: "unsupported currency", tripID: "trip-1", body: valid(""), conv: &mockConverter{err: apperr.ErrUnsupportedCurrency}, want: http.StatusBadRequest},
		{
			name: "happy path", tripID: "trip-1",
			body: valid(`"title":"<b>Ramen</b>","note":"<i>good</i>","expense_date":"2026-03-04","activity_id":"act-9"`),
			want: http.StatusCreated,
			verify: func(t *testing.T, b map[string]any) {
				checks := map[string]any{
					"id": "new-exp-id", "trip_id": "trip-1", "title": "Ramen", "note": "good",
					"amount": float64(10), "currency": "USD", "converted_amount": float64(150000),
					"base_currency": "IDR", "category": "food", "expense_date": "2026-03-04",
					"activity_id": "act-9",
				}
				for k, want := range checks {
					if b[k] != want {
						t.Errorf("%s = %v, want %v", k, b[k], want)
					}
				}
			},
		},
		{
			name: "no activity_id renders null", tripID: "trip-1", body: valid(""), want: http.StatusCreated,
			verify: func(t *testing.T, b map[string]any) {
				if v, ok := b["activity_id"]; !ok || v != nil {
					t.Errorf("activity_id = %v (present=%v), want null", v, ok)
				}
			},
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			h := newTestHandler(seededRepo(), tc.conv)
			rec, err := callHandler(t, h.Create, http.MethodPost, tc.body, handlerTestUser, map[string]string{"trip_id": tc.tripID})
			if got := statusOf(t, rec, err); got != tc.want {
				t.Fatalf("status = %d, want %d (err=%v)", got, tc.want, err)
			}
			if tc.verify != nil {
				tc.verify(t, decodeBody(t, rec))
			}
		})
	}
}

func TestHandler_Update(t *testing.T) {
	tests := []struct {
		name string
		id   string
		body string
		want int
	}{
		{name: "malformed json", id: "exp-1", body: `nope`, want: http.StatusBadRequest},
		{name: "missing title", id: "exp-1", body: `{"amount":5,"currency":"USD","category":"food"}`, want: http.StatusBadRequest},
		{name: "zero amount", id: "exp-1", body: `{"title":"x","amount":0,"currency":"USD","category":"food"}`, want: http.StatusBadRequest},
		{name: "title too long", id: "exp-1", body: `{"title":"` + strings.Repeat("a", 201) + `","amount":5,"currency":"USD","category":"food"}`, want: http.StatusBadRequest},
		{name: "note too long", id: "exp-1", body: `{"title":"x","amount":5,"currency":"USD","category":"food","note":"` + strings.Repeat("n", 2001) + `"}`, want: http.StatusBadRequest},
		{name: "missing currency mapped to invalid currency", id: "exp-1", body: `{"title":"x","amount":5,"category":"food"}`, want: http.StatusBadRequest},
		{name: "invalid category", id: "exp-1", body: `{"title":"x","amount":5,"currency":"USD","category":"nope"}`, want: http.StatusBadRequest},
		{name: "not found", id: "missing", body: `{"title":"x","amount":5,"currency":"USD","category":"food"}`, want: http.StatusNotFound},
		{name: "forbidden", id: "exp-2", body: `{"title":"x","amount":5,"currency":"USD","category":"food"}`, want: http.StatusForbidden},
		{name: "ok", id: "exp-1", body: `{"title":"Dinner","amount":2,"currency":"jpy","category":"shopping","expense_date":"2026-05-06"}`, want: http.StatusOK},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			h := newTestHandler(seededRepo(), nil)
			rec, err := callHandler(t, h.Update, http.MethodPut, tc.body, handlerTestUser, map[string]string{"id": tc.id})
			if got := statusOf(t, rec, err); got != tc.want {
				t.Fatalf("status = %d, want %d (err=%v)", got, tc.want, err)
			}
			if tc.want != http.StatusOK {
				return
			}
			b := decodeBody(t, rec)
			checks := map[string]any{
				"id": "exp-1", "title": "Dinner", "amount": float64(2), "currency": "JPY",
				"converted_amount": float64(30000), "base_currency": "IDR",
				"category": "shopping", "expense_date": "2026-05-06",
			}
			for k, want := range checks {
				if b[k] != want {
					t.Errorf("%s = %v, want %v", k, b[k], want)
				}
			}
		})
	}
}

func TestHandler_Delete(t *testing.T) {
	tests := []struct {
		name string
		id   string
		want int
	}{
		{name: "not found", id: "missing", want: http.StatusNotFound},
		{name: "forbidden", id: "exp-2", want: http.StatusForbidden},
		{name: "ok", id: "exp-1", want: http.StatusNoContent},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := seededRepo()
			h := newTestHandler(repo, nil)
			rec, err := callHandler(t, h.Delete, http.MethodDelete, "", handlerTestUser, map[string]string{"id": tc.id})
			if got := statusOf(t, rec, err); got != tc.want {
				t.Fatalf("status = %d, want %d (err=%v)", got, tc.want, err)
			}
			if tc.want == http.StatusNoContent {
				if _, still := repo.expenses[tc.id]; still {
					t.Error("expense not deleted")
				}
			}
		})
	}
}

func TestHandler_List(t *testing.T) {
	tests := []struct {
		name      string
		tripID    string
		setup     func(r *mockRepo)
		want      int
		wantItems int
	}{
		{name: "trip not found", tripID: "missing", want: http.StatusNotFound},
		{name: "forbidden", tripID: "trip-2", want: http.StatusForbidden},
		{name: "repo failure is 500", tripID: "trip-1", setup: func(r *mockRepo) { r.listErr = errors.New("db") }, want: http.StatusInternalServerError},
		{name: "empty", tripID: "trip-1", want: http.StatusOK, wantItems: 0},
		{
			name: "two items", tripID: "trip-1", want: http.StatusOK, wantItems: 2,
			setup: func(r *mockRepo) {
				r.listResult = []Expense{
					{ID: "a", TripID: "trip-1", Title: "A", Category: CategoryFood, ExpenseDate: time.Date(2026, 7, 8, 0, 0, 0, 0, time.UTC)},
					{ID: "b", TripID: "trip-1", Title: "B", Category: CategoryOther},
				}
			},
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := seededRepo()
			if tc.setup != nil {
				tc.setup(repo)
			}
			h := newTestHandler(repo, nil)
			rec, err := callHandler(t, h.List, http.MethodGet, "", handlerTestUser, map[string]string{"trip_id": tc.tripID})
			if got := statusOf(t, rec, err); got != tc.want {
				t.Fatalf("status = %d, want %d (err=%v)", got, tc.want, err)
			}
			if tc.want != http.StatusOK {
				return
			}
			items, ok := decodeBody(t, rec)["items"].([]any)
			if !ok || len(items) != tc.wantItems {
				t.Fatalf("items = %v, want array of %d", items, tc.wantItems)
			}
			if tc.wantItems > 0 {
				first := items[0].(map[string]any)
				if first["id"] != "a" || first["expense_date"] != "2026-07-08" || first["category"] != "food" {
					t.Errorf("first item = %v", first)
				}
			}
		})
	}
}

func TestHandler_Summary(t *testing.T) {
	tests := []struct {
		name    string
		tripID  string
		summary *Summary
		want    int
		wantCat int
	}{
		{name: "trip not found", tripID: "missing", want: http.StatusNotFound},
		{name: "forbidden", tripID: "trip-2", want: http.StatusForbidden},
		{name: "no categories renders empty array", tripID: "trip-1", summary: &Summary{BaseCurrency: "IDR"}, want: http.StatusOK, wantCat: 0},
		{
			name: "with categories", tripID: "trip-1", want: http.StatusOK, wantCat: 2,
			summary: &Summary{TotalBase: 300, BaseCurrency: "IDR", ByCategory: []CategoryTotal{
				{Category: CategoryFood, Total: 100}, {Category: CategoryTransport, Total: 200},
			}},
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := seededRepo()
			repo.summaryResult = tc.summary
			h := newTestHandler(repo, nil)
			rec, err := callHandler(t, h.Summary, http.MethodGet, "", handlerTestUser, map[string]string{"trip_id": tc.tripID})
			if got := statusOf(t, rec, err); got != tc.want {
				t.Fatalf("status = %d, want %d (err=%v)", got, tc.want, err)
			}
			if tc.want != http.StatusOK {
				return
			}
			b := decodeBody(t, rec)
			if b["base_currency"] != "IDR" || b["total_base"] != tc.summary.TotalBase {
				t.Errorf("base/total = %v/%v", b["base_currency"], b["total_base"])
			}
			cats, ok := b["by_category"].([]any)
			if !ok || len(cats) != tc.wantCat {
				t.Fatalf("by_category = %v, want array of %d", b["by_category"], tc.wantCat)
			}
			if tc.wantCat > 0 {
				first := cats[0].(map[string]any)
				if first["category"] != "food" || first["total"] != float64(100) {
					t.Errorf("first category = %v", first)
				}
			}
		})
	}
}
