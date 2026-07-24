package summary

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/ahmadhafizh/navisha/backend/pkg/llm"
)

// ErrForbidden is returned when the user does not own the trip.

var ErrForbidden = errors.New("forbidden")

// ErrLLMUnavailable is returned when the LLM call fails (network error,
// upstream timeout, client disconnect / context canceled, decode failure).
// The handler maps this to 503 so the frontend can show a "try again" message
// instead of a generic 500.
var ErrLLMUnavailable = errors.New("summary generation is temporarily unavailable")

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
}

func NewUsecase(repo Repository, llm LLMClient, provider TripDataProvider, model string) *Usecase {
	return &Usecase{repo: repo, llm: llm, provider: provider, model: model}
}

var _ UsecaseInterface = (*Usecase)(nil)

// Generate builds the trip context, calls the LLM, and persists the result.
// Enforces ownership (via provider) and a soft rate limit when configured.
func (u *Usecase) Generate(ctx context.Context, userID, tripID string) (*Summary, error) {
	// Assemble context (also enforces ownership).
	tripCtx, err := u.provider.GetTripContext(ctx, userID, tripID)
	if err != nil {
		return nil, err
	}

	system, user := BuildPrompt(*tripCtx)
	temp := TemperatureForTrip(tripCtx.TripID)
	content, err := u.llm.ChatCompletion(ctx, llm.ChatRequest{
		Model:       u.model,
		Temperature: &temp,
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
		slog.Error("summary.Generate: llm failed", "trip_id", tripID, "error", err)
		return nil, fmt.Errorf("%w: %w", ErrLLMUnavailable, err)
	}

	if content == "" {
		slog.Warn("summary.Generate: llm returned empty content", "trip_id", tripID)
		return nil, fmt.Errorf("%w: empty response", ErrLLMUnavailable)
	}

	return u.repo.Save(tripID, content, u.model)
}

// Get returns the cached summary. Verifies ownership via the repository's
// trip owner lookup — much cheaper than GetTripContext which assembles the
// full cross-domain snapshot (activities, expenses, etc.) just for an
// ownership check.
func (u *Usecase) Get(ctx context.Context, userID, tripID string) (*Summary, error) {
	if err := u.repo.VerifyTripOwner(ctx, userID, tripID); err != nil {
		return nil, err
	}
	return u.repo.GetByTripID(tripID)
}

// Delete removes the cached summary. Verifies ownership first via the
// lightweight repository check rather than the full trip context assembly.
func (u *Usecase) Delete(ctx context.Context, userID, tripID string) error {
	if err := u.repo.VerifyTripOwner(ctx, userID, tripID); err != nil {
		return err
	}
	return u.repo.Delete(tripID)
}
