package summary

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/ahmadhafizh/navisha/backend/pkg/openrouter"
)

// --- fakes ---

type fakeRepo struct {
	saved   *Summary
	stored  *Summary
	getErr  error
	saveErr error
	delErr  error
}

func (f *fakeRepo) Save(tripID, content, model string) (*Summary, error) {
	if f.saveErr != nil {
		return nil, f.saveErr
	}
	f.saved = &Summary{
		ID:        "s1",
		TripID:    tripID,
		Content:   content,
		Model:     model,
		UpdatedAt: time.Now(),
	}
	return f.saved, nil
}

func (f *fakeRepo) GetByTripID(tripID string) (*Summary, error) {
	if f.getErr != nil {
		return nil, f.getErr
	}
	return f.stored, nil
}

func (f *fakeRepo) Delete(tripID string) error { return f.delErr }

type fakeLLM struct {
	resp   string
	err    error
	called bool
}

func (f *fakeLLM) ChatCompletion(ctx context.Context, req openrouter.ChatRequest) (string, error) {
	f.called = true
	return f.resp, f.err
}

type fakeProvider struct {
	ctx *TripContext
	err error
}

func (f *fakeProvider) GetTripContext(ctx context.Context, userID, tripID string) (*TripContext, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.ctx, nil
}

func newTripContext() *TripContext {
	return &TripContext{
		Title:        "Bali Trip",
		Destination:  "Bali, Indonesia",
		StartDate:    time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC),
		EndDate:      time.Date(2026, 7, 5, 0, 0, 0, 0, time.UTC),
		TotalDays:    5,
		BaseCurrency: "IDR",
	}
}

// testWindow is the soft rate-limit window used by tests.
const testWindow = 5 * time.Minute

// --- tests ---

func TestGenerate_NewSummary(t *testing.T) {
	repo := &fakeRepo{getErr: ErrNotFound}
	llm := &fakeLLM{resp: "Your Bali adventure awaits!"}
	provider := &fakeProvider{ctx: newTripContext()}
	uc := NewUsecase(repo, llm, provider, "test-model").WithRateLimitWindow(testWindow)

	s, err := uc.Generate(context.Background(), "user1", "trip1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !llm.called {
		t.Error("expected LLM to be called")
	}
	if s.Content != "Your Bali adventure awaits!" {
		t.Errorf("unexpected content: %q", s.Content)
	}
	if s.Model != "test-model" {
		t.Errorf("unexpected model: %q", s.Model)
	}
}

func TestGenerate_RateLimited(t *testing.T) {
	repo := &fakeRepo{stored: &Summary{
		ID:        "s1",
		TripID:    "trip1",
		Content:   "old",
		UpdatedAt: time.Now().Add(-1 * time.Minute), // within 5-min window
	}}
	llm := &fakeLLM{resp: "new"}
	provider := &fakeProvider{ctx: newTripContext()}
	uc := NewUsecase(repo, llm, provider, "test-model").WithRateLimitWindow(testWindow)

	_, err := uc.Generate(context.Background(), "user1", "trip1")
	var rl *RateLimitError
	if !errors.As(err, &rl) {
		t.Fatalf("expected RateLimitError, got %v", err)
	}
	if rl.RetryAfter <= 0 || rl.RetryAfter > testWindow {
		t.Errorf("unexpected RetryAfter: %v", rl.RetryAfter)
	}
	if llm.called {
		t.Error("LLM should not be called when rate limited")
	}
}

func TestGenerate_RateLimitDisabled(t *testing.T) {
	// A recent summary exists, but window is zero (disabled) -> should regenerate.
	repo := &fakeRepo{stored: &Summary{
		ID:        "s1",
		TripID:    "trip1",
		Content:   "old",
		UpdatedAt: time.Now().Add(-1 * time.Second),
	}}
	llm := &fakeLLM{resp: "fresh"}
	provider := &fakeProvider{ctx: newTripContext()}
	uc := NewUsecase(repo, llm, provider, "test-model") // no WithRateLimitWindow -> 0

	s, err := uc.Generate(context.Background(), "user1", "trip1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !llm.called {
		t.Error("expected LLM to be called when rate limit is disabled")
	}
	if s.Content != "fresh" {
		t.Errorf("expected regenerated content, got %q", s.Content)
	}
}

func TestGenerate_RegenerateAfterWindow(t *testing.T) {
	repo := &fakeRepo{stored: &Summary{
		ID:        "s1",
		TripID:    "trip1",
		Content:   "old",
		UpdatedAt: time.Now().Add(-10 * time.Minute), // past the window
	}}
	llm := &fakeLLM{resp: "fresh summary"}
	provider := &fakeProvider{ctx: newTripContext()}
	uc := NewUsecase(repo, llm, provider, "test-model")

	s, err := uc.Generate(context.Background(), "user1", "trip1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if s.Content != "fresh summary" {
		t.Errorf("expected regenerated content, got %q", s.Content)
	}
}

func TestGenerate_ForbiddenPropagates(t *testing.T) {
	repo := &fakeRepo{getErr: ErrNotFound}
	llm := &fakeLLM{resp: "x"}
	provider := &fakeProvider{err: ErrForbidden}
	uc := NewUsecase(repo, llm, provider, "test-model")

	_, err := uc.Generate(context.Background(), "user1", "trip1")
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
	if llm.called {
		t.Error("LLM should not be called when not the owner")
	}
}

func TestGet_NotFound(t *testing.T) {
	repo := &fakeRepo{getErr: ErrNotFound}
	provider := &fakeProvider{ctx: newTripContext()}
	uc := NewUsecase(repo, &fakeLLM{}, provider, "test-model")

	_, err := uc.Get(context.Background(), "user1", "trip1")
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestBuildPrompt_IncludesKeyFields(t *testing.T) {
	ctx := newTripContext()
	ctx.Budget = 1000
	ctx.TotalSpent = 1200 // over budget
	ctx.Accommodations = []AccommodationContext{
		{Name: "Hotel A", Type: "hotel", LocationName: "Kuta", CheckIn: ctx.StartDate, CheckOut: ctx.EndDate},
	}
	system, user := BuildPrompt(*ctx)

	if system == "" {
		t.Error("system prompt should not be empty")
	}
	for _, want := range []string{"Bali Trip", "Bali, Indonesia", "IDR", "Hotel A", "Over budget"} {
		if !contains(user, want) {
			t.Errorf("user prompt missing %q\n---\n%s", want, user)
		}
	}
}

func TestBuildPrompt_RecommendsWhenNoActivities(t *testing.T) {
	ctx := newTripContext()
	// No days/activities at all.
	_, user := BuildPrompt(*ctx)
	if !contains(user, "no activities yet") {
		t.Errorf("expected no-activities recommendation signal\n---\n%s", user)
	}
}

func TestBuildPrompt_FlagsEmptyDays(t *testing.T) {
	ctx := newTripContext()
	ctx.TotalDays = 2
	ctx.Days = []DayContext{
		{DayNumber: 1, Date: ctx.StartDate, Activities: []ActivityContext{
			{Type: "location", Title: "Beach", LocationName: "Kuta"},
		}},
		{DayNumber: 2, Date: ctx.EndDate}, // empty
	}
	_, user := BuildPrompt(*ctx)
	if !contains(user, "Itinerary Density: 1/2") {
		t.Errorf("expected density 1/2\n---\n%s", user)
	}
	if !contains(user, "empty days: [2]") {
		t.Errorf("expected empty days signal\n---\n%s", user)
	}
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (indexOf(s, sub) >= 0)
}

func indexOf(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}
