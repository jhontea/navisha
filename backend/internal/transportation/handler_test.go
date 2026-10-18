package transportation

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/jhontea/navisha/backend/internal/middleware"
	"github.com/labstack/echo/v4"
)

const (
	hOwner = "user-1"
	hOther = "user-2"
	hTrip  = "trip-1"
	hItem  = "tr-1"
)

// newHandlerFixture wires the real Usecase on top of the in-memory mockRepo
// so the handler's error mapping is exercised end to end.
func newHandlerFixture() (*Handler, *mockRepo, *mockExpenseCreator) {
	repo := newMockRepo()
	repo.tripOwners[hTrip] = hOwner
	repo.items[hItem] = &Transportation{ID: hItem, TripID: hTrip, Type: TypeBus, FromLocation: "A", ToLocation: "B"}
	repo.itemOf[hItem] = hTrip
	exp := &mockExpenseCreator{}
	return NewHandler(NewUsecase(repo, exp)), repo, exp
}

// serve runs handler through middleware.WithUser. userID == "" means no user context.
func serve(t *testing.T, h func(echo.Context, string) error, method, body, userID string, params map[string]string) (*httptest.ResponseRecorder, error) {
	t.Helper()
	var req *http.Request
	if body != "" {
		req = httptest.NewRequest(method, "/", strings.NewReader(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	} else {
		req = httptest.NewRequest(method, "/", nil)
	}
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)
	for k, v := range params {
		c.SetParamNames(k)
		c.SetParamValues(v)
	}
	if userID != "" {
		c.Set(middleware.UserIDKey, userID)
	}
	return rec, middleware.WithUser(h)(c)
}

func assertHTTPCode(t *testing.T, err error, want int) {
	t.Helper()
	var he *echo.HTTPError
	if !errors.As(err, &he) {
		t.Fatalf("err = %v, want *echo.HTTPError %d", err, want)
	}
	if he.Code != want {
		t.Fatalf("code = %d (%v), want %d", he.Code, he.Message, want)
	}
}

func decode(t *testing.T, rec *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var out map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode %q: %v", rec.Body.String(), err)
	}
	return out
}

func TestHandler_MissingUser_401(t *testing.T) {
	h, _, _ := newHandlerFixture()
	cases := map[string]func(echo.Context, string) error{
		"List": h.List, "Create": h.Create, "Update": h.Update, "Delete": h.Delete,
	}
	for name, fn := range cases {
		t.Run(name, func(t *testing.T) {
			_, err := serve(t, fn, http.MethodGet, "", "", nil)
			assertHTTPCode(t, err, http.StatusUnauthorized)
		})
	}
}

func TestHandler_List(t *testing.T) {
	dep := time.Date(2026, 8, 1, 6, 30, 0, 0, time.FixedZone("WIB", 7*3600))
	tests := []struct {
		name     string
		user     string
		trip     string
		listErr  error
		wantCode int
	}{
		{"owner ok", hOwner, hTrip, nil, http.StatusOK},
		{"forbidden", hOther, hTrip, nil, http.StatusForbidden},
		{"trip not found", hOwner, "missing", nil, http.StatusNotFound},
		{"repo error 500", hOwner, hTrip, errors.New("db down"), http.StatusInternalServerError},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, repo, _ := newHandlerFixture()
			repo.listErr = tt.listErr
			repo.listResult = []Transportation{{ID: "x", TripID: hTrip, Type: TypeFlight, DepartureDatetime: &dep}}
			rec, err := serve(t, h.List, http.MethodGet, "", tt.user, map[string]string{"trip_id": tt.trip})
			if tt.wantCode != http.StatusOK {
				assertHTTPCode(t, err, tt.wantCode)
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			body := decode(t, rec)
			items, _ := body["items"].([]any)
			if len(items) != 1 {
				t.Fatalf("items = %v", body["items"])
			}
			item := items[0].(map[string]any)
			if item["type"] != "flight" || item["id"] != "x" {
				t.Errorf("item = %v", item)
			}
			// Datetimes are always serialized in UTC.
			if item["departure_datetime"] != "2026-07-31T23:30:00Z" {
				t.Errorf("departure_datetime = %v, want UTC", item["departure_datetime"])
			}
			if item["arrival_datetime"] != nil {
				t.Errorf("arrival_datetime = %v, want null", item["arrival_datetime"])
			}
		})
	}
}

func TestHandler_List_EmptyIsArray(t *testing.T) {
	h, _, _ := newHandlerFixture()
	rec, err := serve(t, h.List, http.MethodGet, "", hOwner, map[string]string{"trip_id": hTrip})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(rec.Body.String(), `"items":[]`) {
		t.Errorf("body = %s, want empty array", rec.Body.String())
	}
}

func TestHandler_CreateValidation(t *testing.T) {
	long := strings.Repeat("a", 5001)
	tests := []struct {
		name     string
		user     string
		trip     string
		body     string
		wantCode int
	}{
		{"bad json", hOwner, hTrip, `{"type":`, http.StatusBadRequest},
		{"missing from", hOwner, hTrip, `{"type":"bus","to_location":"B"}`, http.StatusBadRequest},
		{"blank from", hOwner, hTrip, `{"type":"bus","from_location":"   ","to_location":"B"}`, http.StatusBadRequest},
		{"missing to", hOwner, hTrip, `{"type":"bus","from_location":"A"}`, http.StatusBadRequest},
		{"notes too long", hOwner, hTrip, `{"type":"bus","from_location":"A","to_location":"B","notes":"` + long + `"}`, http.StatusBadRequest},
		{"bad departure", hOwner, hTrip, `{"type":"bus","from_location":"A","to_location":"B","departure_datetime":"2026-08-01 10:00"}`, http.StatusBadRequest},
		{"bad arrival", hOwner, hTrip, `{"type":"bus","from_location":"A","to_location":"B","arrival_datetime":"tomorrow"}`, http.StatusBadRequest},
		{"invalid type", hOwner, hTrip, `{"type":"rocket","from_location":"A","to_location":"B"}`, http.StatusBadRequest},
		{"empty type", hOwner, hTrip, `{"from_location":"A","to_location":"B"}`, http.StatusBadRequest},
		{"forbidden", hOther, hTrip, `{"type":"bus","from_location":"A","to_location":"B"}`, http.StatusForbidden},
		{"trip not found", hOwner, "nope", `{"type":"bus","from_location":"A","to_location":"B"}`, http.StatusNotFound},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, repo, _ := newHandlerFixture()
			before := len(repo.items)
			_, err := serve(t, h.Create, http.MethodPost, tt.body, tt.user, map[string]string{"trip_id": tt.trip})
			assertHTTPCode(t, err, tt.wantCode)
			if len(repo.items) != before {
				t.Error("item inserted despite error")
			}
		})
	}
}

func TestHandler_Create_NotesAtLimitOK(t *testing.T) {
	h, _, _ := newHandlerFixture()
	body := `{"type":"bus","from_location":"A","to_location":"B","notes":"` + strings.Repeat("a", 5000) + `"}`
	rec, err := serve(t, h.Create, http.MethodPost, body, hOwner, map[string]string{"trip_id": hTrip})
	if err != nil {
		t.Fatal(err)
	}
	if rec.Code != http.StatusCreated {
		t.Errorf("status = %d", rec.Code)
	}
}

func TestHandler_Create_Success_SanitizesAndReturnsFields(t *testing.T) {
	h, _, exp := newHandlerFixture()
	body := `{"type":"flight","label":"<b>GA 123</b>","operator":"Garuda","reference_number":"PNR1",
		"from_location":" <i>CGK</i> ","to_location":"NRT","departure_datetime":"2026-08-01T06:30:00+07:00",
		"arrival_datetime":"2026-08-01T15:00:00+09:00","notes":"<script>x</script>window seat"}`
	rec, err := serve(t, h.Create, http.MethodPost, body, hOwner, map[string]string{"trip_id": hTrip})
	if err != nil {
		t.Fatal(err)
	}
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d", rec.Code)
	}
	got := decode(t, rec)
	want := map[string]any{
		"id":                 "new-tx-id",
		"trip_id":            hTrip,
		"type":               "flight",
		"label":              "GA 123",
		"operator":           "Garuda",
		"reference_number":   "PNR1",
		"from_location":      "CGK",
		"to_location":        "NRT",
		"departure_datetime": "2026-07-31T23:30:00Z",
		"arrival_datetime":   "2026-08-01T06:00:00Z",
	}
	for k, v := range want {
		if got[k] != v {
			t.Errorf("%s = %v, want %v", k, got[k], v)
		}
	}
	if strings.Contains(got["notes"].(string), "<script>") {
		t.Errorf("notes not sanitized: %v", got["notes"])
	}
	if exp.calls != 0 {
		t.Errorf("expense created without cost: %d calls", exp.calls)
	}
}

func TestHandler_Create_Cost(t *testing.T) {
	tests := []struct {
		name      string
		cost      string
		wantCalls int
		wantCode  int
	}{
		{"valid cost creates expense", `{"amount":150.5,"currency":"USD"}`, 1, http.StatusCreated},
		{"zero amount means no cost", `{"amount":0,"currency":"USD"}`, 0, http.StatusCreated},
		{"negative amount rejected", `{"amount":-10,"currency":"USD"}`, 0, http.StatusBadRequest},
		{"missing currency rejected", `{"amount":10}`, 0, http.StatusBadRequest},
		{"null cost", `null`, 0, http.StatusCreated},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, repo, exp := newHandlerFixture()
			body := `{"type":"train","from_location":"A","to_location":"B","cost":` + tt.cost + `}`
			rec, err := serve(t, h.Create, http.MethodPost, body, hOwner, map[string]string{"trip_id": hTrip})
			if tt.wantCode != http.StatusCreated {
				assertHTTPCode(t, err, tt.wantCode)
			} else {
				if err != nil {
					t.Fatal(err)
				}
				if rec.Code != http.StatusCreated {
					t.Fatalf("status = %d", rec.Code)
				}
			}
			if exp.calls != tt.wantCalls {
				t.Errorf("expense calls = %d, want %d", exp.calls, tt.wantCalls)
			}
			if tt.wantCalls == 1 {
				// No label → title falls back to the type.
				if exp.lastTitle != "train" || exp.lastAmount != 150.5 || exp.lastUser != hOwner {
					t.Errorf("expense args = %+v", exp)
				}
				if repo.commitCalls != 1 {
					t.Errorf("commit calls = %d", repo.commitCalls)
				}
			}
		})
	}
}

func TestHandler_Create_CostExpenseFailure_Rollback500(t *testing.T) {
	h, repo, exp := newHandlerFixture()
	exp.err = errors.New("expense boom")
	body := `{"type":"bus","from_location":"A","to_location":"B","cost":{"amount":5,"currency":"IDR"}}`
	_, err := serve(t, h.Create, http.MethodPost, body, hOwner, map[string]string{"trip_id": hTrip})
	assertHTTPCode(t, err, http.StatusInternalServerError)
	if repo.rollbackCalls != 1 || repo.commitCalls != 0 {
		t.Errorf("rollback=%d commit=%d", repo.rollbackCalls, repo.commitCalls)
	}
}

func TestHandler_Create_ArrivalBeforeDeparture_400(t *testing.T) {
	h, _, _ := newHandlerFixture()
	body := `{"type":"bus","from_location":"A","to_location":"B",
		"departure_datetime":"2026-08-02T10:00:00Z","arrival_datetime":"2026-08-01T10:00:00Z"}`
	_, err := serve(t, h.Create, http.MethodPost, body, hOwner, map[string]string{"trip_id": hTrip})
	assertHTTPCode(t, err, http.StatusBadRequest)
}

func TestHandler_Update(t *testing.T) {
	valid := `{"type":"ferry","label":"Fast boat","from_location":"Bali","to_location":"Lombok"}`
	tests := []struct {
		name      string
		user      string
		id        string
		body      string
		updateErr error
		wantCode  int
	}{
		{"success", hOwner, hItem, valid, nil, http.StatusOK},
		{"bad json", hOwner, hItem, `[`, nil, http.StatusBadRequest},
		{"missing from", hOwner, hItem, `{"type":"bus","to_location":"B"}`, nil, http.StatusBadRequest},
		{"missing to", hOwner, hItem, `{"type":"bus","from_location":"A"}`, nil, http.StatusBadRequest},
		{"notes too long", hOwner, hItem, `{"type":"bus","from_location":"A","to_location":"B","notes":"` + strings.Repeat("n", 5001) + `"}`, nil, http.StatusBadRequest},
		{"bad datetime", hOwner, hItem, `{"type":"bus","from_location":"A","to_location":"B","arrival_datetime":"x"}`, nil, http.StatusBadRequest},
		{"invalid type", hOwner, hItem, `{"type":"plane","from_location":"A","to_location":"B"}`, nil, http.StatusBadRequest},
		{"not found", hOwner, "missing", valid, nil, http.StatusNotFound},
		{"forbidden", hOther, hItem, valid, nil, http.StatusForbidden},
		{"repo error", hOwner, hItem, valid, errors.New("db"), http.StatusInternalServerError},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, repo, _ := newHandlerFixture()
			repo.updateErr = tt.updateErr
			rec, err := serve(t, h.Update, http.MethodPut, tt.body, tt.user, map[string]string{"id": tt.id})
			if tt.wantCode != http.StatusOK {
				assertHTTPCode(t, err, tt.wantCode)
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			got := decode(t, rec)
			if got["id"] != hItem || got["type"] != "ferry" || got["label"] != "Fast boat" || got["to_location"] != "Lombok" {
				t.Errorf("response = %v", got)
			}
		})
	}
}

func TestHandler_Delete(t *testing.T) {
	tests := []struct {
		name      string
		user      string
		id        string
		deleteErr error
		wantCode  int
	}{
		{"success", hOwner, hItem, nil, http.StatusNoContent},
		{"not found", hOwner, "missing", nil, http.StatusNotFound},
		{"forbidden", hOther, hItem, nil, http.StatusForbidden},
		{"repo not found", hOwner, hItem, ErrNotFound, http.StatusNotFound},
		{"repo error", hOwner, hItem, errors.New("db"), http.StatusInternalServerError},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, repo, _ := newHandlerFixture()
			repo.deleteErr = tt.deleteErr
			rec, err := serve(t, h.Delete, http.MethodDelete, "", tt.user, map[string]string{"id": tt.id})
			if tt.wantCode != http.StatusNoContent {
				assertHTTPCode(t, err, tt.wantCode)
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if rec.Code != http.StatusNoContent {
				t.Errorf("status = %d", rec.Code)
			}
			if _, ok := repo.items[hItem]; ok {
				t.Error("item not deleted")
			}
		})
	}
}

// HTML is stripped before the required check, so a tag-only location is empty.
func TestHandler_Create_TagOnlyLocation_400(t *testing.T) {
	h, _, _ := newHandlerFixture()
	body := `{"type":"bus","from_location":"<b></b>","to_location":"B"}`
	_, err := serve(t, h.Create, http.MethodPost, body, hOwner, map[string]string{"trip_id": hTrip})
	assertHTTPCode(t, err, http.StatusBadRequest)
}

func TestHandler_Update_Cost(t *testing.T) {
	tests := []struct {
		name       string
		cost       string // JSON, "" = field absent
		wantCalls  int
		wantAmount float64
		wantCode   int
	}{
		{"no cost leaves the linked expense alone", "", 0, 0, http.StatusOK},
		{"cost updates the linked expense", `,"cost":{"amount":750000,"currency":"idr"}`, 1, 750000, http.StatusOK},
		{"zero cost removes it", `,"cost":{"amount":0,"currency":"IDR"}`, 1, 0, http.StatusOK},
		{"negative cost rejected", `,"cost":{"amount":-1,"currency":"IDR"}`, 0, 0, http.StatusBadRequest},
		{"cost without currency rejected", `,"cost":{"amount":5}`, 0, 0, http.StatusBadRequest},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, _, exp := newHandlerFixture()
			body := `{"type":"car","label":"Berangkat","from_location":"A","to_location":"B"` + tt.cost + `}`
			rec, err := serve(t, h.Update, http.MethodPut, body, hOwner, map[string]string{"id": hItem})
			if tt.wantCode != http.StatusOK {
				assertHTTPCode(t, err, tt.wantCode)
				return
			}
			if err != nil || rec.Code != http.StatusOK {
				t.Fatalf("status = %d, err = %v", rec.Code, err)
			}
			if exp.calls != tt.wantCalls {
				t.Fatalf("sync calls = %d, want %d", exp.calls, tt.wantCalls)
			}
			if tt.wantCalls > 0 && (exp.lastKind != "transportation" || exp.lastBooking != hItem ||
				exp.lastTitle != "Berangkat" || exp.lastAmount != tt.wantAmount) {
				t.Errorf("synced %s/%s %q %v", exp.lastKind, exp.lastBooking, exp.lastTitle, exp.lastAmount)
			}
		})
	}
}
