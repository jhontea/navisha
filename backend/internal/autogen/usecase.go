package autogen

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/ahmadhafizh/navisha/backend/pkg/llm"
)

// ErrLLMUnavailable signals a transient LLM failure (network, timeout, decode,
// empty response). Maps to HTTP 503 so the frontend shows "try again".
var ErrLLMUnavailable = errors.New("trip generation is temporarily unavailable")

// LLMClient is the subset of the LLM client this usecase needs.
type LLMClient interface {
	ChatCompletion(ctx context.Context, req llm.ChatRequest) (string, error)
}

// TripCreator persists an approved draft. Implemented by an adapter in
// internal/integration so this package stays decoupled from the trip/activity
// domains. Returns the created trip ID.
type TripCreator interface {
	CreateFromDraft(ctx context.Context, userID string, draft TripDraft, start, end, coverImageURL, description string) (string, error)
}

type DayContextProvider interface {
	GetDayContext(ctx context.Context, userID, tripID, dayID string) (*DayContext, error)
}

type UsecaseInterface interface {
	GenerateDraft(ctx context.Context, userID string, in GenerateInput) (*TripDraft, error)
	GenerateDayPreview(ctx context.Context, userID string, in GenerateDayInput) (*DayPreview, error)
	CreateFromDraft(ctx context.Context, userID string, draft TripDraft, startDate, endDate, coverImageURL, description string) (string, error)
}

type Usecase struct {
	llm                LLMClient
	creator            TripCreator
	model              string
	dayContextProvider DayContextProvider
}

func (u *Usecase) WithDayContextProvider(provider DayContextProvider) *Usecase {
	u.dayContextProvider = provider
	return u
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
	temp := TemperatureForDraft(in)
	content, err := u.llm.ChatCompletion(ctx, llm.ChatRequest{
		Model:       u.model,
		Temperature: &temp,
		Messages: []llm.Message{
			{Role: "system", Content: system},
			{Role: "user", Content: user},
		},
		ResponseFormat: &llm.ResponseFormat{
			Type: "json_schema",
			JSONSchema: &llm.JSONSchema{
				Name:   "trip_draft",
				Strict: true,
				Schema: JSONSchema(),
			},
		},
	})
	if err != nil {
		slog.Error("autogen.GenerateDraft: llm failed", "error", err)
		return nil, fmt.Errorf("%w: %w", ErrLLMUnavailable, err)
	}
	if content == "" {
		return nil, fmt.Errorf("%w: empty response", ErrLLMUnavailable)
	}
	slog.Debug("autogen.GenerateDraft: llm response received", "chars", len(content))

	draft, err := ParseAndValidate(content, in)
	if err != nil {
		if errors.Is(err, ErrInvalidPrompt) {
			return nil, err
		}
		slog.Error("autogen.GenerateDraft: parse failed", "error", err)
		return nil, fmt.Errorf("%w: %v", ErrLLMUnavailable, err)
	}
	return draft, nil
}

// GenerateDayPreview suggests only new activities for one existing day. It is
// deliberately read-only: persistence happens only after the user approves the
// preview in the client.
func (u *Usecase) GenerateDayPreview(ctx context.Context, userID string, in GenerateDayInput) (*DayPreview, error) {
	if u.dayContextProvider == nil {
		return nil, fmt.Errorf("autogen.GenerateDayPreview: day context provider required")
	}
	if in.TripID == "" || in.DayID == "" {
		return nil, fmt.Errorf("%w: trip and day required", ErrInvalidInput)
	}
	if len(in.Instruction) > MaxDayInstructionLen {
		return nil, fmt.Errorf("%w: instruction too long (max %d)", ErrInvalidInput, MaxDayInstructionLen)
	}

	dayContext, err := u.dayContextProvider.GetDayContext(ctx, userID, in.TripID, in.DayID)
	if err != nil {
		return nil, err
	}
	if len(dayContext.Existing) >= MaxActivitiesPerDay {
		return nil, fmt.Errorf("%w: day already has %d activities", ErrInvalidInput, MaxActivitiesPerDay)
	}
	system, user := BuildDayPrompt(*dayContext, in.Instruction)
	temp := 0.5
	content, err := u.llm.ChatCompletion(ctx, llm.ChatRequest{
		Model:       u.model,
		Temperature: &temp,
		Messages:    []llm.Message{{Role: "system", Content: system}, {Role: "user", Content: user}},
		ResponseFormat: &llm.ResponseFormat{Type: "json_schema", JSONSchema: &llm.JSONSchema{
			Name: "day_preview", Strict: true, Schema: DayJSONSchema(),
		}},
	})
	if err != nil {
		slog.Error("autogen.GenerateDayPreview: llm failed", "error", err)
		return nil, fmt.Errorf("%w: %w", ErrLLMUnavailable, err)
	}
	preview, err := ParseAndValidateDayPreview(content, *dayContext)
	if err != nil {
		if errors.Is(err, ErrInvalidPrompt) {
			return nil, err
		}
		return nil, fmt.Errorf("%w: %v", ErrLLMUnavailable, err)
	}
	return preview, nil
}

// CreateFromDraft persists an approved draft via the TripCreator adapter.
func (u *Usecase) CreateFromDraft(ctx context.Context, userID string, draft TripDraft, startDate, endDate, coverImageURL, description string) (string, error) {
	if len(draft.Days) == 0 {
		return "", fmt.Errorf("%w: draft has no days", ErrInvalidInput)
	}
	return u.creator.CreateFromDraft(ctx, userID, draft, startDate, endDate, coverImageURL, description)
}
