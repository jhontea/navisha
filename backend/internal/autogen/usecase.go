package autogen

import (
	"context"
	"errors"
	"fmt"
	"log"

	"github.com/ahmadhafizh/navisha/backend/pkg/openrouter"
)

// ErrLLMUnavailable signals a transient LLM failure (network, timeout, decode,
// empty response). Maps to HTTP 503 so the frontend shows "try again".
var ErrLLMUnavailable = errors.New("trip generation is temporarily unavailable")

// LLMClient is the subset of the OpenRouter client this usecase needs.
type LLMClient interface {
	ChatCompletion(ctx context.Context, req openrouter.ChatRequest) (string, error)
}

// TripCreator persists an approved draft. Implemented by an adapter in
// internal/integration so this package stays decoupled from the trip/activity
// domains. Returns the created trip ID.
type TripCreator interface {
	CreateFromDraft(ctx context.Context, userID string, draft TripDraft, start, end string) (string, error)
}

type UsecaseInterface interface {
	GenerateDraft(ctx context.Context, userID string, in GenerateInput) (*TripDraft, error)
	CreateFromDraft(ctx context.Context, userID string, draft TripDraft, startDate, endDate string) (string, error)
}

type Usecase struct {
	llm     LLMClient
	creator TripCreator
	model   string
}

func NewUsecase(llm LLMClient, creator TripCreator, model string) *Usecase {
	return &Usecase{llm: llm, creator: creator, model: model}
}

var _ UsecaseInterface = (*Usecase)(nil)

// GenerateDraft validates the input, calls the LLM with a JSON-schema response
// format, and validates the result. It does NOT persist anything.
//
// Note: coordinates (lat/lng) are intentionally NOT resolved here. The LLM is
// not trusted for coordinates (they are stripped during validation); instead
// the frontend resolves each location name to real coordinates via the Google
// Places API (same flow as the manual location autocomplete) before the trip
// is created.
func (u *Usecase) GenerateDraft(ctx context.Context, userID string, in GenerateInput) (*TripDraft, error) {
	if err := ValidateInput(in); err != nil {
		return nil, err
	}

	system, user := BuildPrompt(in)
	content, err := u.llm.ChatCompletion(ctx, openrouter.ChatRequest{
		Model: u.model,
		Messages: []openrouter.Message{
			{Role: "system", Content: system},
			{Role: "user", Content: user},
		},
		ResponseFormat: &openrouter.ResponseFormat{
			Type: "json_schema",
			JSONSchema: &openrouter.JSONSchema{
				Name:   "trip_draft",
				Strict: true,
				Schema: JSONSchema(),
			},
		},
	})
	if err != nil {
		log.Printf("autogen.GenerateDraft: llm failed: %v", err)
		return nil, fmt.Errorf("%w: %v", ErrLLMUnavailable, err)
	}
	if content == "" {
		return nil, fmt.Errorf("%w: empty response", ErrLLMUnavailable)
	}
	log.Printf("autogen.GenerateDraft: raw llm response (%d chars): %s", len(content), content)

	draft, err := ParseAndValidate(content, in)
	if err != nil {
		// ErrInvalidPrompt (ok=false / unusable) propagates as-is; a parse
		// failure is treated as a transient LLM issue.
		if errors.Is(err, ErrInvalidPrompt) {
			return nil, err
		}
		log.Printf("autogen.GenerateDraft: parse failed: %v", err)
		return nil, fmt.Errorf("%w: %v", ErrLLMUnavailable, err)
	}
	return draft, nil
}

// CreateFromDraft persists an approved draft via the TripCreator adapter.
func (u *Usecase) CreateFromDraft(ctx context.Context, userID string, draft TripDraft, startDate, endDate string) (string, error) {
	if len(draft.Days) == 0 {
		return "", fmt.Errorf("%w: draft has no days", ErrInvalidInput)
	}
	return u.creator.CreateFromDraft(ctx, userID, draft, startDate, endDate)
}
