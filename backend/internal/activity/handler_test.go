package activity

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/jhontea/navisha/backend/internal/middleware"
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

// seededRepo: day-1 owned by user-1, day-2 owned by someone else;
// act-1 (note) lives in day-1, act-2 lives in day-2.
func seededRepo() *mockRepo {
	r := newMockRepo()
	r.dayOwners["day-1"] = handlerTestUser
	r.dayOwners["day-2"] = "other-user"
	r.activities["act-1"] = &Activity{ID: "act-1", DayID: "day-1", Type: TypeNote, Title: "Old title", Payload: json.RawMessage(`{"content":"hi"}`)}
	r.activities["act-2"] = &Activity{ID: "act-2", DayID: "day-2", Type: TypeNote, Title: "Not mine"}
	r.dayIDs["day-1"] = []string{"act-1", "act-3"}
	return r
}

func TestHandler_MissingUser_Returns401(t *testing.T) {
	h := NewHandler(NewUsecase(seededRepo()))
	handlers := map[string]func(echo.Context, string) error{
		"List": h.List, "Create": h.Create, "Update": h.Update, "Delete": h.Delete, "Reorder": h.Reorder,
	}
	for name, fn := range handlers {
		t.Run(name, func(t *testing.T) {
			rec, err := callHandler(t, fn, http.MethodPost, `{}`, "", map[string]string{"day_id": "day-1", "id": "act-1"})
			if got := statusOf(t, rec, err); got != http.StatusUnauthorized {
				t.Errorf("status = %d, want 401", got)
			}
		})
	}
}

func TestHandler_Create(t *testing.T) {
	longTitle := strings.Repeat("a", 201)
	bigPayload := `{"content":"` + strings.Repeat("x", 65536) + `"}`
	tests := []struct {
		name   string
		dayID  string
		body   string
		want   int
		verify func(t *testing.T, body map[string]any, repo *mockRepo)
	}{
		{name: "malformed json", dayID: "day-1", body: `{"title":`, want: http.StatusBadRequest},
		{name: "wrong field type", dayID: "day-1", body: `{"title":123,"type":"note"}`, want: http.StatusBadRequest},
		{name: "missing title", dayID: "day-1", body: `{"type":"note"}`, want: http.StatusBadRequest},
		{name: "whitespace title", dayID: "day-1", body: `{"type":"note","title":"   "}`, want: http.StatusBadRequest},
		{name: "title too long", dayID: "day-1", body: `{"type":"note","title":"` + longTitle + `"}`, want: http.StatusBadRequest},
		{name: "payload too large", dayID: "day-1", body: `{"type":"note","title":"x","payload":` + bigPayload + `}`, want: http.StatusBadRequest},
		{name: "missing type", dayID: "day-1", body: `{"title":"x"}`, want: http.StatusBadRequest},
		{name: "invalid type", dayID: "day-1", body: `{"type":"flight","title":"x"}`, want: http.StatusBadRequest},
		{name: "html-only title sanitized to empty", dayID: "day-1", body: `{"type":"note","title":"<b></b>"}`, want: http.StatusBadRequest},
		{name: "location payload without name", dayID: "day-1", body: `{"type":"location","title":"x","payload":{"lat":1}}`, want: http.StatusBadRequest},
		{name: "location payload bad url scheme", dayID: "day-1", body: `{"type":"location","title":"x","payload":{"location_name":"A","external_url":"javascript:alert(1)"}}`, want: http.StatusBadRequest},
		{name: "note payload wrong shape", dayID: "day-1", body: `{"type":"note","title":"x","payload":"just a string"}`, want: http.StatusBadRequest},
		{name: "day not found", dayID: "missing", body: `{"type":"note","title":"x"}`, want: http.StatusNotFound},
		{name: "day owned by other user", dayID: "day-2", body: `{"type":"note","title":"x"}`, want: http.StatusForbidden},
		{
			name: "happy path sanitizes title and appends at end", dayID: "day-1",
			body: `{"type":"todo","title":"<b>Pack</b>  bags","start_time":"09:00","end_time":"10:00","payload":{"items":[{"id":"i1","text":"socks","completed":false}]}}`,
			want: http.StatusCreated,
			verify: func(t *testing.T, body map[string]any, _ *mockRepo) {
				if body["id"] != "new-act-id" || body["day_id"] != "day-1" || body["type"] != "todo" {
					t.Errorf("unexpected identity fields: %v", body)
				}
				if body["title"] != "Pack bags" {
					t.Errorf("title = %q, want sanitized %q", body["title"], "Pack bags")
				}
				if body["start_time"] != "09:00" || body["end_time"] != "10:00" {
					t.Errorf("times = %v/%v", body["start_time"], body["end_time"])
				}
				if body["order_index"] != float64(2) {
					t.Errorf("order_index = %v, want 2", body["order_index"])
				}
				p, ok := body["payload"].(map[string]any)
				if !ok || len(p["items"].([]any)) != 1 {
					t.Errorf("payload not passed through: %v", body["payload"])
				}
			},
		},
		{
			name: "title of exactly 200 chars accepted", dayID: "day-1",
			body: `{"type":"note","title":"` + strings.Repeat("a", 200) + `"}`,
			want: http.StatusCreated,
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := seededRepo()
			repo.listByDayResult = []Activity{{ID: "act-1", DayID: "day-1"}, {ID: "act-3", DayID: "day-1"}}
			h := NewHandler(NewUsecase(repo))
			rec, err := callHandler(t, h.Create, http.MethodPost, tc.body, handlerTestUser, map[string]string{"day_id": tc.dayID})
			if got := statusOf(t, rec, err); got != tc.want {
				t.Fatalf("status = %d, want %d (err=%v)", got, tc.want, err)
			}
			if tc.verify != nil {
				tc.verify(t, decodeBody(t, rec), repo)
			}
		})
	}
}

func TestHandler_List(t *testing.T) {
	tests := []struct {
		name      string
		dayID     string
		setup     func(r *mockRepo)
		want      int
		wantItems int
	}{
		{name: "day not found", dayID: "missing", want: http.StatusNotFound},
		{name: "forbidden", dayID: "day-2", want: http.StatusForbidden},
		{name: "unmapped repo error is 500", dayID: "day-1", setup: func(r *mockRepo) { r.findDayErr = errors.New("db down") }, want: http.StatusInternalServerError},
		{name: "empty list", dayID: "day-1", want: http.StatusOK, wantItems: 0},
		{
			name: "two items", dayID: "day-1", want: http.StatusOK, wantItems: 2,
			setup: func(r *mockRepo) {
				r.listByDayResult = []Activity{
					{ID: "a", DayID: "day-1", Type: TypeNote, Title: "A", Payload: json.RawMessage(`{"content":"c"}`)},
					{ID: "b", DayID: "day-1", Type: TypeTodo, Title: "B", OrderIndex: 1},
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
			h := NewHandler(NewUsecase(repo))
			rec, err := callHandler(t, h.List, http.MethodGet, "", handlerTestUser, map[string]string{"day_id": tc.dayID})
			if got := statusOf(t, rec, err); got != tc.want {
				t.Fatalf("status = %d, want %d (err=%v)", got, tc.want, err)
			}
			if tc.want != http.StatusOK {
				return
			}
			body := decodeBody(t, rec)
			items, ok := body["items"].([]any)
			if !ok {
				t.Fatalf("items must be a JSON array (not null), got %v", body["items"])
			}
			if len(items) != tc.wantItems {
				t.Fatalf("len(items) = %d, want %d", len(items), tc.wantItems)
			}
			if tc.wantItems == 2 {
				first := items[0].(map[string]any)
				if first["id"] != "a" || first["payload"].(map[string]any)["content"] != "c" {
					t.Errorf("first item = %v", first)
				}
				if second := items[1].(map[string]any); second["payload"] != nil {
					t.Errorf("empty payload should render as null, got %v", second["payload"])
				}
			}
		})
	}
}

func TestHandler_Update(t *testing.T) {
	tests := []struct {
		name      string
		id        string
		body      string
		want      int
		wantTitle string
	}{
		{name: "malformed json", id: "act-1", body: `not json`, want: http.StatusBadRequest},
		{name: "title too long", id: "act-1", body: `{"title":"` + strings.Repeat("a", 201) + `"}`, want: http.StatusBadRequest},
		{name: "payload too large", id: "act-1", body: `{"payload":{"content":"` + strings.Repeat("x", 65536) + `"}}`, want: http.StatusBadRequest},
		{name: "invalid payload for type", id: "act-1", body: `{"payload":[1,2]}`, want: http.StatusBadRequest},
		{name: "not found", id: "missing", body: `{"title":"x"}`, want: http.StatusNotFound},
		{name: "forbidden", id: "act-2", body: `{"title":"x"}`, want: http.StatusForbidden},
		{name: "happy path sanitizes title", id: "act-1", body: `{"title":"<i>New</i>","start_time":"08:00"}`, want: http.StatusOK, wantTitle: "New"},
		{name: "empty title keeps existing", id: "act-1", body: `{"title":""}`, want: http.StatusOK, wantTitle: "Old title"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			h := NewHandler(NewUsecase(seededRepo()))
			rec, err := callHandler(t, h.Update, http.MethodPut, tc.body, handlerTestUser, map[string]string{"id": tc.id})
			if got := statusOf(t, rec, err); got != tc.want {
				t.Fatalf("status = %d, want %d (err=%v)", got, tc.want, err)
			}
			if tc.want == http.StatusOK {
				body := decodeBody(t, rec)
				if body["id"] != tc.id || body["title"] != tc.wantTitle {
					t.Errorf("id/title = %v/%v, want %v/%v", body["id"], body["title"], tc.id, tc.wantTitle)
				}
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
		{name: "forbidden", id: "act-2", want: http.StatusForbidden},
		{name: "repo failure is 500", id: "act-1", setup: func(r *mockRepo) { r.deleteErr = errors.New("boom") }, want: http.StatusInternalServerError},
		{name: "ok", id: "act-1", want: http.StatusNoContent},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := seededRepo()
			if tc.setup != nil {
				tc.setup(repo)
			}
			h := NewHandler(NewUsecase(repo))
			rec, err := callHandler(t, h.Delete, http.MethodDelete, "", handlerTestUser, map[string]string{"id": tc.id})
			if got := statusOf(t, rec, err); got != tc.want {
				t.Fatalf("status = %d, want %d (err=%v)", got, tc.want, err)
			}
			if tc.want == http.StatusNoContent {
				if _, still := repo.activities[tc.id]; still {
					t.Error("activity not deleted")
				}
				if rec.Body.Len() != 0 {
					t.Errorf("204 must have empty body, got %q", rec.Body.String())
				}
			}
		})
	}
}

func TestHandler_Reorder(t *testing.T) {
	tests := []struct {
		name  string
		dayID string
		body  string
		want  int
	}{
		{name: "malformed json", dayID: "day-1", body: `{"ids":`, want: http.StatusBadRequest},
		{name: "ids wrong type", dayID: "day-1", body: `{"ids":"act-1"}`, want: http.StatusBadRequest},
		{name: "set mismatch", dayID: "day-1", body: `{"ids":["act-1"]}`, want: http.StatusBadRequest},
		{name: "unknown id", dayID: "day-1", body: `{"ids":["act-1","zzz"]}`, want: http.StatusBadRequest},
		{name: "day not found", dayID: "missing", body: `{"ids":[]}`, want: http.StatusNotFound},
		{name: "forbidden", dayID: "day-2", body: `{"ids":[]}`, want: http.StatusForbidden},
		{name: "ok", dayID: "day-1", body: `{"ids":["act-3","act-1"]}`, want: http.StatusNoContent},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := seededRepo()
			h := NewHandler(NewUsecase(repo))
			rec, err := callHandler(t, h.Reorder, http.MethodPut, tc.body, handlerTestUser, map[string]string{"day_id": tc.dayID})
			if got := statusOf(t, rec, err); got != tc.want {
				t.Fatalf("status = %d, want %d (err=%v)", got, tc.want, err)
			}
			if tc.want == http.StatusNoContent {
				got := map[string]int{}
				for _, u := range repo.orderUpdates {
					got[u.id] = u.order
				}
				if got["act-3"] != 0 || got["act-1"] != 1 {
					t.Errorf("order updates = %v, want act-3→0, act-1→1", got)
				}
			}
		})
	}
}

func TestHandler_CreateBatch(t *testing.T) {
	post := func(repo *mockRepo, body string) (*httptest.ResponseRecorder, error) {
		return callHandler(t, NewHandler(NewUsecase(repo)).CreateBatch, http.MethodPost, body, handlerTestUser,
			map[string]string{"day_id": "day-1"})
	}
	items := func(n int) string {
		parts := make([]string, n)
		for i := range parts {
			parts[i] = `{"type":"note","title":"t"}`
		}
		return `{"items":[` + strings.Join(parts, ",") + `]}`
	}
	cases := []struct {
		name string
		body string
		want int
	}{
		{"success", items(3), http.StatusCreated},
		{"empty list", `{"items":[]}`, http.StatusBadRequest},
		{"over limit", items(maxBatchItems + 1), http.StatusBadRequest},
		{"at limit", items(maxBatchItems), http.StatusCreated},
		{"invalid item", `{"items":[{"type":"note","title":"ok"},{"type":"bogus","title":"x"}]}`, http.StatusBadRequest},
		{"blank title", `{"items":[{"type":"note","title":"  "}]}`, http.StatusBadRequest},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			repo := seededRepo()
			rec, err := post(repo, tc.body)
			if got := statusOf(t, rec, err); got != tc.want {
				t.Fatalf("status = %d, want %d", got, tc.want)
			}
			if tc.want == http.StatusBadRequest && len(repo.batchInserted) != 0 {
				t.Errorf("wrote %d rows on rejected batch", len(repo.batchInserted))
			}
			if tc.name == "success" {
				if n := len(decodeBody(t, rec)["items"].([]any)); n != len(repo.listByDayResult) {
					t.Errorf("items = %d, want day list (%d)", n, len(repo.listByDayResult))
				}
			}
		})
	}

	t.Run("foreign day", func(t *testing.T) {
		repo := seededRepo()
		rec, err := callHandler(t, NewHandler(NewUsecase(repo)).CreateBatch, http.MethodPost, items(1), handlerTestUser,
			map[string]string{"day_id": "day-2"})
		if got := statusOf(t, rec, err); got != http.StatusForbidden {
			t.Errorf("status = %d, want 403", got)
		}
	})
}
