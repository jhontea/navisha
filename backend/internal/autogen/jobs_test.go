package autogen

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/labstack/echo/v4"
	"github.com/redis/go-redis/v9"
)

// jobsFixture runs the handler against a real Redis job store (miniredis) and
// the quota checker, so TTLs, SET NX and the Lua release behave like production.
type jobsFixture struct {
	h     *Handler
	uc    *gateUsecase
	fr    *fakeRedis
	mr    *miniredis.Miniredis
	store JobStore
	now   time.Time
}

// gateUsecase lets a test hold GenerateDraft open to observe the running state.
type gateUsecase struct {
	stubUsecase
	release chan struct{}
	panicIt bool
}

func (g *gateUsecase) GenerateDraft(ctx context.Context, userID string, in GenerateInput) (*TripDraft, error) {
	if g.release != nil {
		<-g.release
	}
	if g.panicIt {
		panic("boom")
	}
	return g.stubUsecase.GenerateDraft(ctx, userID, in)
}

func newJobsFixture(t *testing.T) *jobsFixture {
	t.Helper()
	q, fr := newQuotaChecker(t, 5, nil)
	rdb := redis.NewClient(&redis.Options{Addr: fr.mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	uc := &gateUsecase{stubUsecase: stubUsecase{
		draft: &TripDraft{Title: "Tokyo Trip", Destination: "Tokyo", TotalDays: 2},
	}}
	store := NewJobStore(rdb)
	f := &jobsFixture{uc: uc, fr: fr, mr: fr.mr, store: store, now: time.Now()}
	f.h = NewHandler(uc).WithQuota(q).WithJobs(store, 5*time.Second)
	f.h.now = func() time.Time { return f.now }
	return f
}

func (f *jobsFixture) start(t *testing.T, user string) (*httptest.ResponseRecorder, error) {
	t.Helper()
	return do(t, f.h.StartJob, http.MethodPost, reqOpts{body: genBody("Tokyo", "", "2026-11-01", "2026-11-02"), user: user})
}

func (f *jobsFixture) get(t *testing.T, user, id string) (*httptest.ResponseRecorder, error) {
	t.Helper()
	return do(t, f.h.GetJob, http.MethodGet, reqOpts{user: user, params: map[string]string{"id": id}})
}

func (f *jobsFixture) startOK(t *testing.T, user string) string {
	t.Helper()
	rec, err := f.start(t, user)
	if err != nil {
		t.Fatalf("StartJob: %v", err)
	}
	if rec.Code != http.StatusAccepted {
		t.Fatalf("status = %d, want 202", rec.Code)
	}
	id, _ := decodeBody(t, rec)["job_id"].(string)
	if id == "" {
		t.Fatalf("no job_id in %s", rec.Body.String())
	}
	return id
}

func (f *jobsFixture) job(t *testing.T, user, id string) map[string]any {
	t.Helper()
	rec, err := f.get(t, user, id)
	if err != nil {
		t.Fatalf("GetJob: %v", err)
	}
	return decodeBody(t, rec)
}

func TestStartJob_Success(t *testing.T) {
	f := newJobsFixture(t)
	f.uc.release = make(chan struct{})

	id := f.startOK(t, testUser)
	if got := f.job(t, testUser, id)["status"]; got != "running" {
		t.Fatalf("status while generating = %v, want running", got)
	}
	if got := f.fr.used(testUser); got != 1 {
		t.Errorf("quota used = %d, want 1", got)
	}

	close(f.uc.release)
	f.h.jobWG.Wait()

	got := f.job(t, testUser, id)
	if got["status"] != "done" {
		t.Fatalf("status = %v, want done", got["status"])
	}
	draft, _ := got["draft"].(map[string]any)
	if draft["title"] != "Tokyo Trip" {
		t.Errorf("draft = %v", got["draft"])
	}
	if got["start_date"] != "2026-11-01" || got["end_date"] != "2026-11-02" {
		t.Errorf("dates = %v / %v", got["start_date"], got["end_date"])
	}
	if f.uc.genIn.Destination != "Tokyo" {
		t.Errorf("destination passed = %q", f.uc.genIn.Destination)
	}
	if f.fr.used(testUser) != 1 {
		t.Error("a successful job keeps its quota")
	}
	if f.mr.Exists(activeKeyPrefix + testUser) {
		t.Error("active slot must be released after the job ends")
	}
}

func TestStartJob_SecondStartWhileRunning_409(t *testing.T) {
	f := newJobsFixture(t)
	f.uc.release = make(chan struct{})

	id := f.startOK(t, testUser)
	_, err := f.start(t, testUser)
	he := wantHTTPErr(t, err, http.StatusConflict)
	m, _ := he.Message.(map[string]any)
	if m["job_id"] != id || m["code"] != "JOB_ACTIVE" {
		t.Errorf("409 body = %v, want job_id %s", m, id)
	}
	if got := f.fr.used(testUser); got != 1 {
		t.Errorf("quota used = %d, want 1 (rejected start must not consume)", got)
	}

	close(f.uc.release)
	f.h.jobWG.Wait()

	// The slot is free again afterwards.
	f.uc.release = nil
	f.startOK(t, testUser)
	f.h.jobWG.Wait()
}

func TestStartJob_OtherUsersDoNotBlockEachOther(t *testing.T) {
	f := newJobsFixture(t)
	f.uc.release = make(chan struct{})
	f.startOK(t, "u1")
	f.startOK(t, "u2")
	close(f.uc.release)
	f.h.jobWG.Wait()
}

func TestStartJob_LLMFailure_FailedAndRefunded(t *testing.T) {
	f := newJobsFixture(t)
	f.uc.draft, f.uc.draftErr = nil, ErrLLMUnavailable

	id := f.startOK(t, testUser)
	f.h.jobWG.Wait()

	got := f.job(t, testUser, id)
	if got["status"] != "failed" {
		t.Fatalf("status = %v, want failed", got["status"])
	}
	e, _ := got["error"].(map[string]any)
	if e["code"] != "LLM_UNAVAILABLE" || e["message"] == "" {
		t.Errorf("error = %v", got["error"])
	}
	if f.fr.used(testUser) != 0 {
		t.Errorf("quota used = %d, want refunded to 0", f.fr.used(testUser))
	}
	if f.mr.Exists(activeKeyPrefix + testUser) {
		t.Error("active slot must be released after a failure")
	}
}

func TestStartJob_InvalidPrompt_FailedWithoutRefund(t *testing.T) {
	f := newJobsFixture(t)
	f.uc.draft, f.uc.draftErr = nil, ErrInvalidPrompt

	id := f.startOK(t, testUser)
	f.h.jobWG.Wait()

	got := f.job(t, testUser, id)
	e, _ := got["error"].(map[string]any)
	if got["status"] != "failed" || e["code"] != "INVALID_PROMPT" {
		t.Errorf("job = %v", got)
	}
	if f.fr.used(testUser) != 1 {
		t.Errorf("quota used = %d, want 1 (a declined prompt keeps its quota)", f.fr.used(testUser))
	}
}

func TestStartJob_Panic_FailedAndSlotReleased(t *testing.T) {
	f := newJobsFixture(t)
	f.uc.panicIt = true

	id := f.startOK(t, testUser)
	f.h.jobWG.Wait()

	if got := f.job(t, testUser, id); got["status"] != "failed" {
		t.Errorf("status = %v, want failed", got["status"])
	}
	if f.mr.Exists(activeKeyPrefix + testUser) {
		t.Error("active slot must be released after a panic")
	}
	if f.fr.used(testUser) != 0 {
		t.Error("a panic refunds the quota")
	}
}

func TestStartJob_InvalidInput_NoQuotaNoSlot(t *testing.T) {
	f := newJobsFixture(t)
	_, err := do(t, f.h.StartJob, http.MethodPost, reqOpts{body: genBody("Tokyo", "", "2026-11-05", "2026-11-01"), user: testUser})
	wantHTTPErr(t, err, http.StatusUnprocessableEntity)
	if f.fr.used(testUser) != 0 || f.mr.Exists(activeKeyPrefix+testUser) {
		t.Error("invalid input must not consume quota or take the slot")
	}
}

func TestStartJob_QuotaExceeded_ReleasesSlot(t *testing.T) {
	f := newJobsFixture(t)
	_ = f.mr.Set(todayKey(testUser), "5") // limit is 5

	_, err := f.start(t, testUser)
	wantHTTPErr(t, err, http.StatusTooManyRequests)
	if f.mr.Exists(activeKeyPrefix + testUser) {
		t.Error("a quota rejection must not leave the slot taken")
	}
}

func TestStartJob_RedisDown_503NoQuota(t *testing.T) {
	f := newJobsFixture(t)
	// Quota and jobs share a server in this fixture, so break only the job
	// store by pointing it at a closed client.
	dead := redis.NewClient(&redis.Options{Addr: "127.0.0.1:1", DialTimeout: 50 * time.Millisecond, MaxRetries: -1})
	t.Cleanup(func() { _ = dead.Close() })
	f.h.WithJobs(NewJobStore(dead), time.Second)

	_, err := f.start(t, testUser)
	wantHTTPErr(t, err, http.StatusServiceUnavailable)
	if f.fr.used(testUser) != 0 {
		t.Errorf("quota used = %d, want 0 when Redis is down", f.fr.used(testUser))
	}
	if f.uc.genCalls != 0 {
		t.Error("no generation without the job store")
	}
}

func TestGetJob_NotFound(t *testing.T) {
	f := newJobsFixture(t)
	_, err := f.get(t, testUser, "nope")
	wantHTTPErr(t, err, http.StatusNotFound)
}

func TestGetJob_OtherUsersJob_404(t *testing.T) {
	f := newJobsFixture(t)
	id := f.startOK(t, "u1")
	f.h.jobWG.Wait()

	_, err := f.get(t, "u2", id)
	wantHTTPErr(t, err, http.StatusNotFound)
}

func TestGetJob_ExpiredTTL_404(t *testing.T) {
	f := newJobsFixture(t)
	id := f.startOK(t, testUser)
	f.h.jobWG.Wait()

	f.mr.FastForward(jobTTL + time.Second)
	_, err := f.get(t, testUser, id)
	wantHTTPErr(t, err, http.StatusNotFound)
}

func TestGetJob_StaleRunningReportedFailed(t *testing.T) {
	f := newJobsFixture(t)
	// A job left "running" by a backend that restarted.
	job := Job{ID: "old", UserID: testUser, Status: JobRunning, CreatedAt: f.now.Add(-staleAfter - time.Second), StartDate: "2026-11-01", EndDate: "2026-11-02"}
	if err := f.store.Save(context.Background(), job); err != nil {
		t.Fatal(err)
	}

	got := f.job(t, testUser, "old")
	e, _ := got["error"].(map[string]any)
	if got["status"] != "failed" || e["code"] != "JOB_INTERRUPTED" {
		t.Errorf("job = %v, want failed/JOB_INTERRUPTED", got)
	}

	job.ID, job.CreatedAt = "fresh", f.now.Add(-time.Minute)
	_ = f.store.Save(context.Background(), job)
	if got := f.job(t, testUser, "fresh"); got["status"] != "running" {
		t.Errorf("recent running job reported %v", got["status"])
	}
}

func TestActiveJob(t *testing.T) {
	f := newJobsFixture(t)
	active := func() (*httptest.ResponseRecorder, error) {
		return do(t, f.h.ActiveJob, http.MethodGet, reqOpts{user: testUser})
	}

	_, err := active()
	wantHTTPErr(t, err, http.StatusNotFound)

	f.uc.release = make(chan struct{})
	id := f.startOK(t, testUser)
	rec, err := active()
	if err != nil {
		t.Fatal(err)
	}
	if b := decodeBody(t, rec); b["job_id"] != id || b["status"] != "running" {
		t.Errorf("active while running = %v", b)
	}

	close(f.uc.release)
	f.h.jobWG.Wait()
	rec, err = active()
	if err != nil {
		t.Fatal(err)
	}
	if b := decodeBody(t, rec); b["job_id"] != id || b["status"] != "done" {
		t.Errorf("last job after finishing = %v", b)
	}
}

func TestJobStore_ReleaseOnlyDeletesOwnSlot(t *testing.T) {
	f := newJobsFixture(t)
	ctx := context.Background()

	if _, ok, err := f.store.TryAcquire(ctx, testUser, "job-new"); err != nil || !ok {
		t.Fatalf("TryAcquire = %v, %v", ok, err)
	}
	// An older job finishing late must not free the newer job's slot.
	if err := f.store.Release(ctx, testUser, "job-old"); err != nil {
		t.Fatal(err)
	}
	if !f.mr.Exists(activeKeyPrefix + testUser) {
		t.Fatal("Release of another job's id removed the active slot")
	}
	existing, ok, err := f.store.TryAcquire(ctx, testUser, "job-3")
	if err != nil || ok || existing != "job-new" {
		t.Errorf("TryAcquire while held = %q, %v, %v", existing, ok, err)
	}
	if err := f.store.Release(ctx, testUser, "job-new"); err != nil {
		t.Fatal(err)
	}
	if f.mr.Exists(activeKeyPrefix + testUser) {
		t.Error("the holder's Release must free the slot")
	}
}

func TestJobStore_ActiveSlotExpires(t *testing.T) {
	f := newJobsFixture(t)
	ctx := context.Background()
	_, _, _ = f.store.TryAcquire(ctx, testUser, "stuck")
	f.mr.FastForward(activeTTL + time.Second)
	if _, ok, err := f.store.TryAcquire(ctx, testUser, "next"); err != nil || !ok {
		t.Errorf("a crashed job must not block the user past activeTTL: ok=%v err=%v", ok, err)
	}
}

func TestJobRoutes_OnlyWhenEnabled(t *testing.T) {
	routes := func(h *Handler) []string {
		e := echo.New()
		noAuth := func(next echo.HandlerFunc) echo.HandlerFunc { return next }
		h.RegisterRoutes(e.Group("/api/v1"), noAuth)
		var out []string
		for _, r := range e.Routes() {
			out = append(out, r.Method+" "+r.Path)
		}
		return out
	}
	has := func(rs []string, want string) bool {
		for _, r := range rs {
			if r == want {
				return true
			}
		}
		return false
	}

	plain := routes(NewHandler(&stubUsecase{}))
	if has(plain, "POST /api/v1/trips/generate/jobs") {
		t.Error("job routes must not exist without a job store")
	}
	if !has(plain, "POST /api/v1/trips/generate") {
		t.Error("the synchronous generate route must stay")
	}

	f := newJobsFixture(t)
	with := routes(f.h)
	for _, want := range []string{
		"POST /api/v1/trips/generate", "POST /api/v1/trips/generate/jobs",
		"GET /api/v1/trips/generate/jobs/active", "GET /api/v1/trips/generate/jobs/:id",
	} {
		if !has(with, want) {
			t.Errorf("missing route %q in %s", want, strings.Join(with, ", "))
		}
	}
}

func TestJobError_MapsLikeMapErr(t *testing.T) {
	cases := []struct {
		err  error
		code string
	}{
		{ErrLLMUnavailable, "LLM_UNAVAILABLE"},
		{ErrInvalidPrompt, "INVALID_PROMPT"},
		{errors.New("db exploded"), "LLM_UNAVAILABLE"}, // unknown errors never leak
	}
	for _, c := range cases {
		got := jobError(c.err)
		if got.Code != c.code || got.Message == "" || strings.Contains(got.Message, "exploded") {
			t.Errorf("jobError(%v) = %+v", c.err, got)
		}
	}
	if _, err := json.Marshal(jobError(ErrLLMUnavailable)); err != nil {
		t.Fatal(err)
	}
}
