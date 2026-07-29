package activity

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"

	"github.com/ahmadhafizh/navisha/backend/internal/apperr"
)

type UsecaseInterface interface {
	List(ctx context.Context, userID, dayID string) ([]Activity, error)
	// ListByDayIDs batch-fetches activities for multiple days owned by the same user.
	// Phase 3D: eliminates N+1 queries when loading trip context.
	ListByDayIDs(ctx context.Context, userID string, dayIDs []string) (map[string][]Activity, error)
	Create(ctx context.Context, userID, dayID string, in CreateInput) (*Activity, error)
	CreateMany(ctx context.Context, userID string, inputs []CreateManyInput) error
	Update(ctx context.Context, userID, activityID string, in UpdateInput) (*Activity, error)
	Delete(ctx context.Context, userID, activityID string) error
	Reorder(ctx context.Context, userID, dayID string, orderedIDs []string) error
}

type CreateInput struct {
	Type      Type
	Title     string
	StartTime string
	EndTime   string
	Payload   json.RawMessage
}

type CreateManyInput struct {
	DayID string
	CreateInput
}

type UpdateInput struct {
	Title     string
	StartTime string
	EndTime   string
	Payload   json.RawMessage
}

type Usecase struct {
	repo Repository
}

func NewUsecase(repo Repository) *Usecase {
	return &Usecase{repo: repo}
}

var _ UsecaseInterface = (*Usecase)(nil)

func (u *Usecase) List(ctx context.Context, userID, dayID string) ([]Activity, error) {
	if err := u.verifyDayOwnership(ctx, userID, dayID); err != nil {
		return nil, err
	}
	return u.repo.ListByDay(ctx, dayID)
}

// ListByDayIDs batch-fetches activities for multiple days. Verifies ownership
// via the first day (all days must belong to the same user's trip).
// Phase 3D: eliminates N+1 queries when loading trip context.
func (u *Usecase) ListByDayIDs(ctx context.Context, userID string, dayIDs []string) (map[string][]Activity, error) {
	if len(dayIDs) == 0 {
		return make(map[string][]Activity), nil
	}
	// Verify ownership on the first day; the caller (trip context) guarantees
	// all dayIDs belong to the same trip, hence same user.
	if err := u.verifyDayOwnership(ctx, userID, dayIDs[0]); err != nil {
		return nil, err
	}
	return u.repo.ListByDayIDs(ctx, dayIDs)
}

func (u *Usecase) Create(ctx context.Context, userID, dayID string, in CreateInput) (*Activity, error) {
	if err := u.verifyDayOwnership(ctx, userID, dayID); err != nil {
		return nil, err
	}
	if !in.Type.Valid() {
		return nil, ErrInvalidType
	}
	if in.Title == "" {
		return nil, fmt.Errorf("activity.Create: %w: title required", ErrInvalidPayload)
	}
	if err := validatePayload(in.Type, in.Payload); err != nil {
		return nil, err
	}

	// Place new activity at end of day's ordering.
	existing, err := u.repo.ListIDsByDay(ctx, dayID)
	if err != nil {
		return nil, err
	}

	a := &Activity{
		DayID:      dayID,
		Type:       in.Type,
		Title:      in.Title,
		StartTime:  in.StartTime,
		EndTime:    in.EndTime,
		OrderIndex: len(existing),
		Payload:    in.Payload,
	}
	return u.repo.Insert(ctx, a)
}

// CreateMany validates and inserts activities for multiple days in one
// transaction. Ownership is checked once for the distinct day set and the
// repository assigns order indexes after any existing activities per day.
func (u *Usecase) CreateMany(ctx context.Context, userID string, inputs []CreateManyInput) error {
	if len(inputs) == 0 {
		return nil
	}

	daySet := make(map[string]struct{}, len(inputs))
	relativeOrder := make(map[string]int, len(inputs))
	activities := make([]Activity, 0, len(inputs))
	for _, item := range inputs {
		if item.DayID == "" {
			return ErrDayNotFound
		}
		if !item.Type.Valid() {
			return ErrInvalidType
		}
		if item.Title == "" {
			return fmt.Errorf("activity.CreateMany: %w: title required", ErrInvalidPayload)
		}
		if err := validatePayload(item.Type, item.Payload); err != nil {
			return err
		}
		activities = append(activities, Activity{
			DayID: item.DayID, Type: item.Type, Title: item.Title,
			StartTime: item.StartTime, EndTime: item.EndTime,
			OrderIndex: relativeOrder[item.DayID], Payload: item.Payload,
		})
		relativeOrder[item.DayID]++
		daySet[item.DayID] = struct{}{}
	}

	dayIDs := make([]string, 0, len(daySet))
	for dayID := range daySet {
		dayIDs = append(dayIDs, dayID)
	}

	tx, err := u.repo.BeginTx(ctx)
	if err != nil {
		return err
	}
	defer u.repo.Rollback(ctx, tx)

	owned, err := u.repo.CountOwnedDaysTx(ctx, tx, userID, dayIDs)
	if err != nil {
		return err
	}
	if owned != len(dayIDs) {
		return apperr.ErrForbidden
	}
	if err := u.repo.BatchInsertTx(ctx, tx, activities); err != nil {
		return err
	}
	return u.repo.Commit(ctx, tx)
}

func (u *Usecase) Update(ctx context.Context, userID, activityID string, in UpdateInput) (*Activity, error) {
	owner, _, err := u.repo.FindActivityOwner(ctx, activityID)
	if err != nil {
		return nil, err
	}
	if owner != userID {
		return nil, apperr.ErrForbidden
	}

	existing, err := u.repo.FindByID(ctx, activityID)
	if err != nil {
		return nil, err
	}
	if in.Title != "" {
		existing.Title = in.Title
	}
	existing.StartTime = in.StartTime
	existing.EndTime = in.EndTime
	if len(in.Payload) > 0 {
		if err := validatePayload(existing.Type, in.Payload); err != nil {
			return nil, err
		}
		existing.Payload = in.Payload
	}
	return u.repo.Update(ctx, existing)
}

func (u *Usecase) Delete(ctx context.Context, userID, activityID string) error {
	owner, _, err := u.repo.FindActivityOwner(ctx, activityID)
	if err != nil {
		return err
	}
	if owner != userID {
		return apperr.ErrForbidden
	}
	return u.repo.Delete(ctx, activityID)
}

// Reorder accepts the full set of activity IDs for the day in their new order.
// Rejects if the set doesn't match exactly (catches drift between client + server).
// Phase 3D: Uses BatchUpdateOrderTx for single-statement atomic update.
func (u *Usecase) Reorder(ctx context.Context, userID, dayID string, orderedIDs []string) error {
	if err := u.verifyDayOwnership(ctx, userID, dayID); err != nil {
		return err
	}

	existing, err := u.repo.ListIDsByDay(ctx, dayID)
	if err != nil {
		return err
	}
	if !sameSet(existing, orderedIDs) {
		return ErrReorderMismatch
	}

	tx, err := u.repo.BeginTx(ctx)
	if err != nil {
		return err
	}
	defer u.repo.Rollback(ctx, tx)

	orderMap := make(map[string]int, len(orderedIDs))
	for i, id := range orderedIDs {
		orderMap[id] = i
	}
	if err := u.repo.BatchUpdateOrderTx(ctx, tx, orderMap); err != nil {
		return err
	}
	return u.repo.Commit(ctx, tx)
}

func (u *Usecase) verifyDayOwnership(ctx context.Context, userID, dayID string) error {
	owner, err := u.repo.FindDayOwner(ctx, dayID)
	if err != nil {
		return err
	}
	if owner != userID {
		return apperr.ErrForbidden
	}
	return nil
}

// validatePayload checks shape per activity type. Empty payload allowed
// (some clients may not send one); strict validation only when present.
func validatePayload(t Type, payload json.RawMessage) error {
	if len(payload) == 0 {
		return nil
	}
	switch t {
	case TypeLocation:
		var p LocationPayload
		if err := json.Unmarshal(payload, &p); err != nil {
			return fmt.Errorf("activity.payload location: %w", ErrInvalidPayload)
		}
		if p.LocationName == "" {
			return fmt.Errorf("location_name required: %w", ErrInvalidPayload)
		}
		if p.LocationVerification != "" && p.LocationVerification != "verified" && p.LocationVerification != "needs_review" {
			return fmt.Errorf("location_verification invalid: %w", ErrInvalidPayload)
		}
		if p.ExternalURL != "" && !validExternalURL(p.ExternalURL) {
			return fmt.Errorf("external_url must use http or https: %w", ErrInvalidPayload)
		}
	case TypeNote:
		var p NotePayload
		if err := json.Unmarshal(payload, &p); err != nil {
			return fmt.Errorf("activity.payload note: %w", ErrInvalidPayload)
		}
	case TypeTodo:
		var p TodoPayload
		if err := json.Unmarshal(payload, &p); err != nil {
			return fmt.Errorf("activity.payload todo: %w", ErrInvalidPayload)
		}
	}
	return nil
}

func validExternalURL(value string) bool {
	if len(value) > 2048 {
		return false
	}
	parsed, err := url.ParseRequestURI(value)
	if err != nil || parsed.Host == "" {
		return false
	}
	return strings.EqualFold(parsed.Scheme, "http") ||
		strings.EqualFold(parsed.Scheme, "https")
}

func sameSet(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	seen := map[string]int{}
	for _, x := range a {
		seen[x]++
	}
	for _, x := range b {
		if seen[x] == 0 {
			return false
		}
		seen[x]--
	}
	return true
}
