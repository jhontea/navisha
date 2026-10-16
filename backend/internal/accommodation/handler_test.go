package accommodation

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

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

// seededRepo: trip-1 owned by user-1, trip-2 by someone else; stay-1
// (apartment) belongs to trip-1, stay-2 to trip-2.
func seededRepo() *mockRepo {
	r := newMockRepo()
	r.tripOwners["trip-1"] = handlerTestUser
	r.tripOwners["trip-2"] = "other-user"
	r.items["stay-1"] = &Accommodation{ID: "stay-1", TripID: "trip-1", AccommodationType: TypeApartment, Name: "Old",
		CheckIn: date(2026, 1, 1), CheckOut: date(2026, 1, 3)}
	r.itemOf["stay-1"] = "trip-1"
	r.items["stay-2"] = &Accommodation{ID: "stay-2", TripID: "trip-2", Name: "Not mine"}
	r.itemOf["stay-2"] = "trip-2"
	return r
}

// body builds a request JSON from the valid defaults plus overrides
// (later duplicate keys win in encoding/json).
func body(overrides string) string {
	base := `"name":"Hotel A","check_in":"2026-03-01","check_out":"2026-03-03"`
	if overrides == "" {
		return "{" + base + "}"
	}
	return "{" + base + "," + overrides + "}"
}

func TestHandler_MissingUser_Returns401(t *testing.T) {
	h := NewHandler(NewUsecase(seededRepo(), &mockExpenseCreator{}))
	handlers := map[string]func(echo.Context, string) error{
		"List": h.List, "Create": h.Create, "Update": h.Update, "Delete": h.Delete,
	}
	for name, fn := range handlers {
		t.Run(name, func(t *testing.T) {
			rec, err := callHandler(t, fn, http.MethodPost, body(""), "", map[string]string{"trip_id": "trip-1", "id": "stay-1"})
			if got := statusOf(t, rec, err); got != http.StatusUnauthorized {
				t.Errorf("status = %d, want 401", got)
			}
		})
	}
}

// Validation shared by Create and Update (identical request handling).
var commonValidationCases = []struct {
	name string
	body string
}{
	{"malformed json", `{"name":`},
	{"lat wrong type", body(`"lat":"north"`)},
	{"missing name", `{"check_in":"2026-03-01","check_out":"2026-03-03"}`},
	{"whitespace name", body(`"name":"   "`)},
	{"name too long", body(`"name":"` + strings.Repeat("a", 201) + `"`)},
	{"missing check_in", body(`"check_in":""`)},
	{"missing check_out", body(`"check_out":""`)},
	{"bad date format", body(`"check_in":"01/03/2026"`)},
	{"check_out before check_in", body(`"check_in":"2026-03-05"`)},
	{"invalid accommodation type", body(`"accommodation_type":"castle"`)},
	{"bad check-in time", body(`"check_in_time":"2pm"`)},
	{"out of range check-out time", body(`"check_out_time":"25:00"`)},
	{"same-day check-out before check-in", body(`"check_out":"2026-03-01","check_in_time":"14:00","check_out_time":"10:00"`)},
	{"html-only name sanitized to empty", body(`"name":"<b></b>"`)},
}

func TestHandler_Create_Validation(t *testing.T) {
	for _, tc := range commonValidationCases {
		t.Run(tc.name, func(t *testing.T) {
			ec := &mockExpenseCreator{}
			h := NewHandler(NewUsecase(seededRepo(), ec))
			rec, err := callHandler(t, h.Create, http.MethodPost, tc.body, handlerTestUser, map[string]string{"trip_id": "trip-1"})
			if got := statusOf(t, rec, err); got != http.StatusBadRequest {
				t.Fatalf("status = %d, want 400 (err=%v)", got, err)
			}
			if ec.calls != 0 {
				t.Errorf("expense creator called %d times on invalid input", ec.calls)
			}
		})
	}
}

func TestHandler_Update_Validation(t *testing.T) {
	for _, tc := range commonValidationCases {
		t.Run(tc.name, func(t *testing.T) {
			h := NewHandler(NewUsecase(seededRepo(), &mockExpenseCreator{}))
			rec, err := callHandler(t, h.Update, http.MethodPut, tc.body, handlerTestUser, map[string]string{"id": "stay-1"})
			if got := statusOf(t, rec, err); got != http.StatusBadRequest {
				t.Fatalf("status = %d, want 400 (err=%v)", got, err)
			}
		})
	}
}

func TestHandler_Create(t *testing.T) {
	tests := []struct {
		name      string
		tripID    string
		body      string
		ecErr     error
		want      int
		wantCalls int
		verify    func(t *testing.T, b map[string]any, ec *mockExpenseCreator, repo *mockRepo)
	}{
		{name: "trip not found", tripID: "missing", body: body(""), want: http.StatusNotFound},
		{name: "trip owned by other user", tripID: "trip-2", body: body(""), want: http.StatusForbidden},
		{
			name: "happy path without cost defaults to hotel", tripID: "trip-1",
			body: body(`"name":"<b>Grand</b> Inn","notes":"<i>late</i>","location_name":"<p>Kyoto</p>","lat":35.0,"lng":135.7,"confirmation_number":"ABC"`),
			want: http.StatusCreated,
			verify: func(t *testing.T, b map[string]any, _ *mockExpenseCreator, repo *mockRepo) {
				checks := map[string]any{
					"id": "new-stay-id", "trip_id": "trip-1", "accommodation_type": "hotel",
					"name": "Grand Inn", "notes": "late", "location_name": "Kyoto",
					"lat": 35.0, "lng": 135.7, "confirmation_number": "ABC",
					"check_in": "2026-03-01", "check_out": "2026-03-03",
				}
				for k, want := range checks {
					if b[k] != want {
						t.Errorf("%s = %v, want %v", k, b[k], want)
					}
				}
				if repo.beginTxCalls != 0 {
					t.Errorf("no-cost create should not open a tx, beginTx=%d", repo.beginTxCalls)
				}
			},
		},
		{
			name: "explicit type and nil coordinates", tripID: "trip-1", body: body(`"accommodation_type":"hostel"`),
			want: http.StatusCreated,
			verify: func(t *testing.T, b map[string]any, _ *mockExpenseCreator, _ *mockRepo) {
				if b["accommodation_type"] != "hostel" {
					t.Errorf("type = %v", b["accommodation_type"])
				}
				if b["lat"] != nil || b["lng"] != nil {
					t.Errorf("lat/lng = %v/%v, want null", b["lat"], b["lng"])
				}
				if b["check_in_time"] != nil || b["check_out_time"] != nil {
					t.Errorf("times = %v/%v, want null when not set", b["check_in_time"], b["check_out_time"])
				}
			},
		},
		{
			name: "check-in and check-out times round-trip", tripID: "trip-1",
			body: body(`"check_in_time":" 15:00 ","check_out_time":"11:00"`),
			want: http.StatusCreated,
			verify: func(t *testing.T, b map[string]any, _ *mockExpenseCreator, _ *mockRepo) {
				if b["check_in_time"] != "15:00" || b["check_out_time"] != "11:00" {
					t.Errorf("times = %v/%v, want 15:00/11:00", b["check_in_time"], b["check_out_time"])
				}
			},
		},
		{
			name: "with cost creates linked expense in tx", tripID: "trip-1",
			body: body(`"cost":{"amount":120.5,"currency":"USD"}`), want: http.StatusCreated, wantCalls: 1,
			verify: func(t *testing.T, _ map[string]any, ec *mockExpenseCreator, repo *mockRepo) {
				if ec.lastAmount != 120.5 || ec.lastTitle != "Hotel A" || ec.lastTrip != "trip-1" || ec.lastUser != handlerTestUser {
					t.Errorf("linked expense args = %+v", ec)
				}
				if repo.beginTxCalls != 1 || repo.commitCalls != 1 {
					t.Errorf("tx begin/commit = %d/%d, want 1/1", repo.beginTxCalls, repo.commitCalls)
				}
			},
		},
		{name: "cost with zero amount means no cost", tripID: "trip-1", body: body(`"cost":{"amount":0,"currency":"USD"}`), want: http.StatusCreated, wantCalls: 0},
		{name: "cost without currency rejected", tripID: "trip-1", body: body(`"cost":{"amount":10}`), want: http.StatusBadRequest, wantCalls: 0},
		{name: "negative cost rejected", tripID: "trip-1", body: body(`"cost":{"amount":-5,"currency":"USD"}`), want: http.StatusBadRequest, wantCalls: 0},
		{name: "lowercase cost currency normalized", tripID: "trip-1", body: body(`"cost":{"amount":10,"currency":" usd "}`), want: http.StatusCreated, wantCalls: 1},
		{
			name: "linked expense forbidden maps through wrap", tripID: "trip-1",
			body: body(`"cost":{"amount":10,"currency":"USD"}`), ecErr: apperr.ErrForbidden,
			want: http.StatusForbidden, wantCalls: 1,
		},
		{
			name: "linked expense generic failure is 500", tripID: "trip-1",
			body: body(`"cost":{"amount":10,"currency":"XXX"}`), ecErr: fmt.Errorf("convert: %w", errors.New("no rate")),
			want: http.StatusInternalServerError, wantCalls: 1,
			verify: func(t *testing.T, _ map[string]any, _ *mockExpenseCreator, repo *mockRepo) {
				if repo.rollbackCalls != 1 {
					t.Errorf("rollback = %d, want 1", repo.rollbackCalls)
				}
			},
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := seededRepo()
			ec := &mockExpenseCreator{err: tc.ecErr}
			h := NewHandler(NewUsecase(repo, ec))
			rec, err := callHandler(t, h.Create, http.MethodPost, tc.body, handlerTestUser, map[string]string{"trip_id": tc.tripID})
			if got := statusOf(t, rec, err); got != tc.want {
				t.Fatalf("status = %d, want %d (err=%v)", got, tc.want, err)
			}
			if ec.calls != tc.wantCalls {
				t.Errorf("expense creator calls = %d, want %d", ec.calls, tc.wantCalls)
			}
			if tc.verify != nil {
				var b map[string]any
				if err == nil {
					b = decodeBody(t, rec)
				}
				tc.verify(t, b, ec, repo)
			}
		})
	}
}

func TestHandler_Update(t *testing.T) {
	tests := []struct {
		name     string
		id       string
		body     string
		want     int
		wantType string
		wantCall int
	}{
		{name: "not found", id: "missing", body: body(""), want: http.StatusNotFound},
		{name: "forbidden", id: "stay-2", body: body(""), want: http.StatusForbidden},
		{name: "empty type keeps existing", id: "stay-1", body: body(`"name":"New name"`), want: http.StatusOK, wantType: "apartment"},
		{name: "explicit type replaces", id: "stay-1", body: body(`"accommodation_type":"other"`), want: http.StatusOK, wantType: "other"},
		// Cost is accepted by the request type but ignored on update.
		{name: "cost ignored on update", id: "stay-1", body: body(`"cost":{"amount":50,"currency":"USD"}`), want: http.StatusOK, wantType: "apartment"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			ec := &mockExpenseCreator{}
			h := NewHandler(NewUsecase(seededRepo(), ec))
			rec, err := callHandler(t, h.Update, http.MethodPut, tc.body, handlerTestUser, map[string]string{"id": tc.id})
			if got := statusOf(t, rec, err); got != tc.want {
				t.Fatalf("status = %d, want %d (err=%v)", got, tc.want, err)
			}
			if ec.calls != 0 {
				t.Errorf("expense creator called %d times on update", ec.calls)
			}
			if tc.want != http.StatusOK {
				return
			}
			b := decodeBody(t, rec)
			if b["id"] != "stay-1" || b["accommodation_type"] != tc.wantType {
				t.Errorf("id/type = %v/%v, want stay-1/%s", b["id"], b["accommodation_type"], tc.wantType)
			}
			if b["check_in"] != "2026-03-01" || b["check_out"] != "2026-03-03" {
				t.Errorf("dates = %v..%v", b["check_in"], b["check_out"])
			}
		})
	}
}

func TestHandler_Delete(t *testing.T) {
	tests := []struct {
		name  string
		id    string
		setup func(r *mockRepo)
		want  int
	}{
		{name: "not found", id: "missing", want: http.StatusNotFound},
		{name: "forbidden", id: "stay-2", want: http.StatusForbidden},
		{name: "repo failure is 500", id: "stay-1", setup: func(r *mockRepo) { r.deleteErr = errors.New("db") }, want: http.StatusInternalServerError},
		{name: "ok", id: "stay-1", want: http.StatusNoContent},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := seededRepo()
			if tc.setup != nil {
				tc.setup(repo)
			}
			h := NewHandler(NewUsecase(repo, &mockExpenseCreator{}))
			rec, err := callHandler(t, h.Delete, http.MethodDelete, "", handlerTestUser, map[string]string{"id": tc.id})
			if got := statusOf(t, rec, err); got != tc.want {
				t.Fatalf("status = %d, want %d (err=%v)", got, tc.want, err)
			}
			if tc.want == http.StatusNoContent {
				if _, still := repo.items[tc.id]; still {
					t.Error("accommodation not deleted")
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
		{name: "owner lookup failure is 500", tripID: "trip-1", setup: func(r *mockRepo) { r.tripOwnerErr = errors.New("db") }, want: http.StatusInternalServerError},
		{name: "empty", tripID: "trip-1", want: http.StatusOK, wantItems: 0},
		{
			name: "one item", tripID: "trip-1", want: http.StatusOK, wantItems: 1,
			setup: func(r *mockRepo) {
				r.listResult = []Accommodation{{ID: "s", TripID: "trip-1", AccommodationType: TypeHostel, Name: "S",
					CheckIn: date(2026, 4, 1), CheckOut: date(2026, 4, 2)}}
			},
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := seededRepo()
			if tc.setup != nil {
				tc.setup(repo)
			}
			h := NewHandler(NewUsecase(repo, &mockExpenseCreator{}))
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
			if tc.wantItems == 1 {
				it := items[0].(map[string]any)
				if it["id"] != "s" || it["accommodation_type"] != "hostel" || it["check_in"] != "2026-04-01" || it["check_out"] != "2026-04-02" {
					t.Errorf("item = %v", it)
				}
			}
		})
	}
}
