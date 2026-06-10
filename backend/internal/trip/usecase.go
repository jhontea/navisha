package trip

import (
	"context"
	"fmt"
	"time"

	"github.com/ahmadhafizh/navisha/backend/internal/apperr"
	"github.com/ahmadhafizh/navisha/backend/internal/currency"
)

const (
	defaultListLimit = 20
	maxListLimit     = 50
)

type UsecaseInterface interface {
	Create(ctx context.Context, userID string, in CreateInput) (*Trip, error)
	List(userID, cursor string, limit int) (ListResult, error)
	Get(userID, tripID string) (*Trip, []Day, error)
	Update(userID, tripID string, in UpdateInput) (*Trip, error)
	Delete(userID, tripID string) error
}

type CreateInput struct {
	Title         string
	Description   string
	StartDate     time.Time
	EndDate       time.Time
	BaseCurrency  string
	CoverImageURL string
	Notes         string
}

type UpdateInput struct {
	Title         string
	Description   string
	StartDate     time.Time
	EndDate       time.Time
	BaseCurrency  string
	CoverImageURL string
	Notes         string
}

type Usecase struct {
	repo Repository
}

func NewUsecase(repo Repository) *Usecase {
	return &Usecase{repo: repo}
}

// Create inserts a trip + auto-generated days in a single transaction.
// One day row per date between StartDate and EndDate inclusive.
func (u *Usecase) Create(ctx context.Context, userID string, in CreateInput) (*Trip, error) {
	if err := validateDates(in.StartDate, in.EndDate); err != nil {
		return nil, err
	}
	if !currency.IsSupported(in.BaseCurrency) {
		return nil, ErrInvalidCurrency
	}

	t := &Trip{
		UserID:        userID,
		Title:         in.Title,
		Description:   in.Description,
		StartDate:     in.StartDate,
		EndDate:       in.EndDate,
		BaseCurrency:  in.BaseCurrency,
		CoverImageURL: in.CoverImageURL,
		Notes:         in.Notes,
	}

	tx, err := u.repo.BeginTx(ctx)
	if err != nil {
		return nil, err
	}
	defer u.repo.Rollback(ctx, tx)

	created, err := u.repo.InsertTrip(ctx, tx, t)
	if err != nil {
		return nil, fmt.Errorf("trip.usecase.Create insert trip: %w", err)
	}

	days := generateDays(created.ID, created.StartDate, created.EndDate)
	if err := u.repo.InsertDays(ctx, tx, days); err != nil {
		return nil, fmt.Errorf("trip.usecase.Create insert days: %w", err)
	}

	if err := u.repo.Commit(ctx, tx); err != nil {
		return nil, err
	}
	return created, nil
}

func (u *Usecase) List(userID, cursor string, limit int) (ListResult, error) {
	if limit <= 0 {
		limit = defaultListLimit
	}
	if limit > maxListLimit {
		limit = maxListLimit
	}
	return u.repo.List(userID, cursor, limit)
}

// Get returns the trip with its days. Caller must own the trip.
func (u *Usecase) Get(userID, tripID string) (*Trip, []Day, error) {
	t, err := u.repo.FindByID(tripID)
	if err != nil {
		return nil, nil, err
	}
	if t.UserID != userID {
		return nil, nil, apperr.ErrForbidden
	}
	days, err := u.repo.ListDays(tripID)
	if err != nil {
		return nil, nil, err
	}
	return t, days, nil
}

// Update mutates trip metadata only. Date-range changes do NOT currently
// regenerate days — deferred until itinerary builder is implemented.
func (u *Usecase) Update(userID, tripID string, in UpdateInput) (*Trip, error) {
	existing, err := u.repo.FindByID(tripID)
	if err != nil {
		return nil, err
	}
	if existing.UserID != userID {
		return nil, apperr.ErrForbidden
	}
	if err := validateDates(in.StartDate, in.EndDate); err != nil {
		return nil, err
	}
	if !currency.IsSupported(in.BaseCurrency) {
		return nil, ErrInvalidCurrency
	}

	existing.Title = in.Title
	existing.Description = in.Description
	existing.StartDate = in.StartDate
	existing.EndDate = in.EndDate
	existing.BaseCurrency = in.BaseCurrency
	existing.CoverImageURL = in.CoverImageURL
	existing.Notes = in.Notes

	return u.repo.Update(existing)
}

func (u *Usecase) Delete(userID, tripID string) error {
	existing, err := u.repo.FindByID(tripID)
	if err != nil {
		return err
	}
	if existing.UserID != userID {
		return apperr.ErrForbidden
	}
	return u.repo.Delete(tripID)
}

func validateDates(start, end time.Time) error {
	if start.IsZero() || end.IsZero() {
		return ErrInvalidDates
	}
	if end.Before(start) {
		return ErrInvalidDates
	}
	return nil
}

func generateDays(tripID string, start, end time.Time) []Day {
	start = start.Truncate(24 * time.Hour)
	end = end.Truncate(24 * time.Hour)
	if end.Before(start) {
		return nil
	}

	totalDays := int(end.Sub(start).Hours()/24) + 1
	days := make([]Day, 0, totalDays)
	for i := 0; i < totalDays; i++ {
		days = append(days, Day{
			TripID:    tripID,
			Date:      start.AddDate(0, 0, i),
			DayNumber: i + 1,
		})
	}
	return days
}

var _ UsecaseInterface = (*Usecase)(nil)
