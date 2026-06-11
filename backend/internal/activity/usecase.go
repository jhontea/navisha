package activity

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/ahmadhafizh/navisha/backend/internal/apperr"
)

type UsecaseInterface interface {
	List(userID, dayID string) ([]Activity, error)
	Create(ctx context.Context, userID, dayID string, in CreateInput) (*Activity, error)
	Update(userID, activityID string, in UpdateInput) (*Activity, error)
	Delete(userID, activityID string) error
	Reorder(ctx context.Context, userID, dayID string, orderedIDs []string) error
}

type CreateInput struct {
	Type      Type
	Title     string
	StartTime string
	EndTime   string
	Payload   json.RawMessage
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

func (u *Usecase) List(userID, dayID string) ([]Activity, error) {
	if err := u.verifyDayOwnership(userID, dayID); err != nil {
		return nil, err
	}
	return u.repo.ListByDay(dayID)
}

func (u *Usecase) Create(ctx context.Context, userID, dayID string, in CreateInput) (*Activity, error) {
	if err := u.verifyDayOwnership(userID, dayID); err != nil {
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
	existing, err := u.repo.ListIDsByDay(dayID)
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
	return u.repo.Insert(a)
}

func (u *Usecase) Update(userID, activityID string, in UpdateInput) (*Activity, error) {
	owner, _, err := u.repo.FindActivityOwner(activityID)
	if err != nil {
		return nil, err
	}
	if owner != userID {
		return nil, apperr.ErrForbidden
	}

	existing, err := u.repo.FindByID(activityID)
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
	return u.repo.Update(existing)
}

func (u *Usecase) Delete(userID, activityID string) error {
	owner, _, err := u.repo.FindActivityOwner(activityID)
	if err != nil {
		return err
	}
	if owner != userID {
		return apperr.ErrForbidden
	}
	return u.repo.Delete(activityID)
}

// Reorder accepts the full set of activity IDs for the day in their new order.
// Rejects if the set doesn't match exactly (catches drift between client + server).
func (u *Usecase) Reorder(ctx context.Context, userID, dayID string, orderedIDs []string) error {
	if err := u.verifyDayOwnership(userID, dayID); err != nil {
		return err
	}

	existing, err := u.repo.ListIDsByDay(dayID)
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

	for i, id := range orderedIDs {
		if err := u.repo.UpdateOrderTx(ctx, tx, id, i); err != nil {
			return err
		}
	}
	return u.repo.Commit(ctx, tx)
}

func (u *Usecase) verifyDayOwnership(userID, dayID string) error {
	owner, err := u.repo.FindDayOwner(dayID)
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
