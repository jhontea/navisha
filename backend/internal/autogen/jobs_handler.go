package autogen

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
)

// WithJobs turns on async generation (POST /trips/generate/jobs and polling).
// timeout bounds one background generation; it must not be the request's
// context, which ends when the 202 goes out.
func (h *Handler) WithJobs(store JobStore, timeout time.Duration) *Handler {
	h.jobs = store
	h.jobTimeout = timeout
	return h
}

func (h *Handler) clock() time.Time {
	if h.now != nil {
		return h.now()
	}
	return time.Now()
}

func newJobID() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("autogen.newJobID: %w", err)
	}
	return hex.EncodeToString(b), nil
}

func jobsUnavailable(err error) error {
	slog.Error("autogen: job store failed", "error", err)
	return echo.NewHTTPError(http.StatusServiceUnavailable, map[string]any{
		"code":    "JOBS_UNAVAILABLE",
		"message": "Layanan sedang tidak tersedia. Silakan coba lagi sebentar lagi.",
	})
}

// StartJob validates like Generate, then runs the generation in the
// background: 202 {job_id}, 409 {job_id} when one is already running.
func (h *Handler) StartJob(c echo.Context, userID string) error {
	input, err := parseGenerateInput(c)
	if err != nil {
		return err
	}
	ctx := c.Request().Context()

	jobID, err := newJobID()
	if err != nil {
		return jobsUnavailable(err)
	}
	existing, ok, err := h.jobs.TryAcquire(ctx, userID, jobID)
	if err != nil {
		return jobsUnavailable(err)
	}
	if !ok {
		return echo.NewHTTPError(http.StatusConflict, map[string]any{
			"code":    "JOB_ACTIVE",
			"message": "Ada itinerary yang sedang dibuat. Tunggu sampai selesai.",
			"job_id":  existing,
		})
	}

	if quotaErr := h.quota.Consume(c, userID); quotaErr != nil {
		h.release(userID, jobID)
		return quotaErr
	}

	job := Job{
		ID:        jobID,
		UserID:    userID,
		Status:    JobRunning,
		CreatedAt: h.clock().UTC(),
		StartDate: input.StartDate.Format("2006-01-02"),
		EndDate:   input.EndDate.Format("2006-01-02"),
	}
	if err := h.jobs.Save(ctx, job); err != nil {
		h.release(userID, jobID)
		h.quota.RefundUser(ctx, userID)
		return jobsUnavailable(err)
	}
	// Losing the "last job" pointer only costs coming back to the page.
	if err := h.jobs.SetLast(ctx, userID, jobID); err != nil {
		slog.Warn("autogen: set last job failed", "error", err)
	}

	h.jobWG.Add(1)
	go h.runJob(job, input)

	return c.JSON(http.StatusAccepted, map[string]any{"job_id": jobID})
}

// bgCtx is a short context for bookkeeping after the generation context may
// already be done (timeout).
func bgCtx() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 5*time.Second)
}

func (h *Handler) release(userID, jobID string) {
	ctx, cancel := bgCtx()
	defer cancel()
	if err := h.jobs.Release(ctx, userID, jobID); err != nil {
		slog.Warn("autogen: release active job failed", "job_id", jobID, "error", err)
	}
}

// runJob generates the draft with its own context and records the outcome.
// The active slot is always released, even on panic.
func (h *Handler) runJob(job Job, input GenerateInput) {
	defer h.jobWG.Done()
	defer h.release(job.UserID, job.ID)
	defer func() {
		if r := recover(); r != nil {
			slog.Error("autogen: job panicked", "job_id", job.ID, "panic", r)
			h.failJob(job, errors.New("panic"), true)
		}
	}()

	ctx, cancel := context.WithTimeout(context.Background(), h.jobTimeout)
	defer cancel()

	draft, err := h.usecase.GenerateDraft(ctx, job.UserID, input)
	if err != nil {
		h.failJob(job, err, refundable(err))
		return
	}
	job.Status = JobDone
	job.Draft = draft
	sctx, scancel := bgCtx()
	defer scancel()
	if err := h.jobs.Save(sctx, job); err != nil {
		// Stays "running" and is reported failed once stale; no way to refund
		// reliably for a result the user cannot fetch, so give the quota back.
		slog.Error("autogen: saving finished job failed", "job_id", job.ID, "error", err)
		h.quota.RefundUser(sctx, job.UserID)
	}
}

func (h *Handler) failJob(job Job, cause error, refund bool) {
	ctx, cancel := bgCtx()
	defer cancel()
	job.Status = JobFailed
	job.Error = jobError(cause)
	if err := h.jobs.Save(ctx, job); err != nil {
		slog.Error("autogen: saving failed job failed", "job_id", job.ID, "error", err)
	}
	if refund {
		h.quota.RefundUser(ctx, job.UserID)
	}
}

// jobError gives the same user-safe code and message mapErr would send.
func jobError(err error) *JobError {
	var he *echo.HTTPError
	if errors.As(mapErr(err), &he) {
		if m, ok := he.Message.(map[string]any); ok {
			code, _ := m["code"].(string)
			msg, _ := m["message"].(string)
			if code != "" {
				return &JobError{Code: code, Message: msg}
			}
		}
	}
	return &JobError{Code: "LLM_UNAVAILABLE", Message: "Gagal membuat itinerary saat ini. Silakan coba lagi sebentar lagi."}
}

type jobResponse struct {
	JobID     string     `json:"job_id"`
	Status    JobStatus  `json:"status"`
	CreatedAt time.Time  `json:"created_at"`
	StartDate string     `json:"start_date"`
	EndDate   string     `json:"end_date"`
	Draft     *TripDraft `json:"draft,omitempty"`
	Error     *JobError  `json:"error,omitempty"`
}

func (h *Handler) respondJob(c echo.Context, userID, jobID string) error {
	job, err := h.jobs.Get(c.Request().Context(), jobID)
	if errors.Is(err, ErrJobNotFound) || (err == nil && job.UserID != userID) {
		return echo.NewHTTPError(http.StatusNotFound, "job not found")
	}
	if err != nil {
		return jobsUnavailable(err)
	}
	// Still running long after it started: the backend restarted under it.
	if job.Status == JobRunning && h.clock().Sub(job.CreatedAt) > staleAfter {
		job.Status = JobFailed
		job.Error = &JobError{Code: "JOB_INTERRUPTED", Message: "Pembuatan itinerary terhenti. Silakan coba lagi."}
	}
	return c.JSON(http.StatusOK, jobResponse{
		JobID: job.ID, Status: job.Status, CreatedAt: job.CreatedAt,
		StartDate: job.StartDate, EndDate: job.EndDate, Draft: job.Draft, Error: job.Error,
	})
}

// GetJob: GET /trips/generate/jobs/:id. Someone else's job is a 404.
func (h *Handler) GetJob(c echo.Context, userID string) error {
	return h.respondJob(c, userID, c.Param("id"))
}

// ActiveJob: GET /trips/generate/jobs/active, the user's running job or the
// latest one, so the page can pick up where it was left. 404 when none.
func (h *Handler) ActiveJob(c echo.Context, userID string) error {
	id, err := h.jobs.CurrentJobID(c.Request().Context(), userID)
	if errors.Is(err, ErrJobNotFound) {
		return echo.NewHTTPError(http.StatusNotFound, "job not found")
	}
	if err != nil {
		return jobsUnavailable(err)
	}
	return h.respondJob(c, userID, id)
}
