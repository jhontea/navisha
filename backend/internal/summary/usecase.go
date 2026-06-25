package summary

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/ahmadhafizh/navisha/backend/pkg/llm"
)

// ErrForbidden is returned when the user does not own the trip.

var ErrForbidden = errors.New("forbidden")

// ErrLLMUnavailable is returned when the LLM call fails (network error,
// upstream timeout, client disconnect / context canceled, decode failure).
// The handler maps this to 503 so the frontend can show a "try again" message
// instead of a generic 500.
var ErrLLMUnavailable = errors.New("summary generation is temporarily unavailable")

// RateLimitError carries how long the caller must wait before retrying.
type RateLimitError struct {
	RetryAfter time.Duration
}

func (e *RateLimitError) Error() string {
	return fmt.Sprintf("rate limited, retry after %s", e.RetryAfter)
}

// TripDataProvider assembles the cross-domain trip snapshot. Implemented by
// an adapter in internal/integration so this package stays decoupled from the
// individual domain packages. GetTripContext also enforces ownership: it must
// return ErrForbidden when the user does not own the trip.
type TripDataProvider interface {
	GetTripContext(ctx context.Context, userID, tripID string) (*TripContext, error)
}

// LLMClient is the subset of the LLM client this usecase needs.
type LLMClient interface {
	ChatCompletion(ctx context.Context, req llm.ChatRequest) (string, error)
}

type UsecaseInterface interface {
	Generate(ctx context.Context, userID, tripID string) (*Summary, error)
	Get(ctx context.Context, userID, tripID string) (*Summary, error)
	Delete(ctx context.Context, userID, tripID string) error
}

type Usecase struct {
	repo     Repository
	llm      LLMClient
	provider TripDataProvider
	model    string
	// rateLimitWindow is the soft cooldown between (re)generations for a trip.
	// When zero, the rate-limit check is disabled.
	rateLimitWindow time.Duration
}

func NewUsecase(repo Repository, llm LLMClient, provider TripDataProvider, model string) *Usecase {
	return &Usecase{repo: repo, llm: llm, provider: provider, model: model}
}

// WithRateLimitWindow sets the soft cooldown between summary (re)generations.
// Pass a zero duration to disable the rate-limit check entirely.
func (u *Usecase) WithRateLimitWindow(d time.Duration) *Usecase {
	u.rateLimitWindow = d
	return u
}

var _ UsecaseInterface = (*Usecase)(nil)

// Generate builds the trip context, calls the LLM, and persists the result.
// Enforces ownership (via provider) and a soft rate limit when configured.
func (u *Usecase) Generate(ctx context.Context, userID, tripID string) (*Summary, error) {
	// Rate-limit check: skip entirely when window is zero (disabled).
	if u.rateLimitWindow > 0 {
		if existing, err := u.repo.GetByTripID(tripID); err == nil {
			elapsed := time.Since(existing.UpdatedAt)
			if elapsed < u.rateLimitWindow {
				return nil, &RateLimitError{RetryAfter: u.rateLimitWindow - elapsed}
			}
		} else if !errors.Is(err, ErrNotFound) {
			return nil, err
		}
	}

	// Assemble context (also enforces ownership).
	tripCtx, err := u.provider.GetTripContext(ctx, userID, tripID)
	if err != nil {
		return nil, err
	}

	system, user := BuildPrompt(*tripCtx)
	content, err := u.llm.ChatCompletion(ctx, llm.ChatRequest{
		Model: u.model,
		Messages: []llm.Message{
			{Role: "system", Content: system},
			{Role: "user", Content: user},
		},
	})
	if err != nil {
		// LLM failures (network, upstream timeout, client disconnect /
		// context canceled, decode error) are transient and not a server
		// bug — surface them as ErrLLMUnavailable so the handler returns
		// 503 instead of 500. The original error is logged for debugging.
		log.Printf("summary.Generate: llm failed for trip %s: %v", tripID, err)
		return nil, fmt.Errorf("%w: %v", ErrLLMUnavailable, err)
	}

	if content == "" {
		log.Printf("summary.Generate: llm returned empty content for trip %s", tripID)
		return nil, fmt.Errorf("%w: empty response", ErrLLMUnavailable)
	}

	return u.repo.Save(tripID, content, u.model)
}

// Get returns the cached summary. Verifies ownership via the provider.
func (u *Usecase) Get(ctx context.Context, userID, tripID string) (*Summary, error) {
	// Ownership check — provider returns ErrForbidden / not found as appropriate.
	if _, err := u.provider.GetTripContext(ctx, userID, tripID); err != nil {
		return nil, err
	}
	return u.repo.GetByTripID(tripID)
}

// Delete removes the cached summary. Verifies ownership first.
func (u *Usecase) Delete(ctx context.Context, userID, tripID string) error {
	if _, err := u.provider.GetTripContext(ctx, userID, tripID); err != nil {
		return err
	}
	return u.repo.Delete(tripID)
}
