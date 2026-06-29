package trip

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/ahmadhafizh/navisha/backend/internal/apperr"
	"github.com/ahmadhafizh/navisha/backend/internal/currency"
	"github.com/ahmadhafizh/navisha/backend/pkg/sanitize"
)

const (
	defaultListLimit = 20
	maxListLimit     = 50

	// Input validation limits (Loop 4: prevent overflow/DoS via oversized fields).
	maxTitleLength       = 200
	maxDescriptionLength = 5000
	maxNotesLength       = 10000
	maxCoverImageURLLen  = 2048
	maxTripDurationDays  = 90 // prevent trips spanning years
	minTitleLength       = 1  // title must not be empty
)

type UsecaseInterface interface {
	Create(ctx context.Context, userID string, in CreateInput) (*Trip, error)
	List(userID, cursor string, limit int) (ListResult, error)
	ListFiltered(userID, cursor string, limit int, from, to string) (ListResult, error)
	ListUpcoming(userID string, limit int) ([]Trip, error)
	Get(userID, tripID string) (*Trip, []Day, error)
	Update(ctx context.Context, userID, tripID string, in UpdateInput) (*Trip, error)
	Delete(userID, tripID string) error
	UpdateDayNotes(userID, dayID, notes string) (*Day, error)
}

type CreateInput struct {
	Title         string
	Description   string
	StartDate     time.Time
	EndDate       time.Time
	BaseCurrency  string
	Budget        float64
	CoverImageURL string
	Notes         string
}

type UpdateInput struct {
	Title         string
	Description   string
	StartDate     time.Time
	EndDate       time.Time
	BaseCurrency  string
	Budget        *float64 // nil = leave unchanged; &0.0 = explicitly clear
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
	if err := validateFields(in.Title, in.Description, in.Notes, in.CoverImageURL); err != nil {
		return nil, err
	}
	if !currency.IsSupported(in.BaseCurrency) {
		return nil, ErrInvalidCurrency
	}
	if err := validateBudget(in.Budget); err != nil {
		return nil, err
	}

	// Loop 14: strip HTML tags from user-provided text before storing.
	in.Title = sanitize.Text(in.Title)
	in.Description = sanitize.Text(in.Description)
	in.Notes = sanitize.Text(in.Notes)

	t := &Trip{
		UserID:        userID,
		Title:         in.Title,
		Description:   in.Description,
		StartDate:     in.StartDate,
		EndDate:       in.EndDate,
		BaseCurrency:  in.BaseCurrency,
		Budget:        in.Budget,
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

// ListFiltered returns trips with optional date-range filter + cursor pagination.
// from/to are YYYY-MM-DD strings; empty string means no bound.
func (u *Usecase) ListFiltered(userID, cursor string, limit int, from, to string) (ListResult, error) {
	if limit <= 0 {
		limit = 12
	}
	if limit > maxListLimit {
		limit = maxListLimit
	}
	return u.repo.ListFiltered(userID, cursor, limit, from, to)
}

// ListUpcoming returns trips whose end_date >= today (active + upcoming),
// ordered by start_date ASC (soonest first), default and max 6.
func (u *Usecase) ListUpcoming(userID string, limit int) ([]Trip, error) {
	if limit <= 0 {
		limit = 6
	}
	// Cap upcoming trips to prevent oversized DB queries.
	const maxUpcomingLimit = 20
	if limit > maxUpcomingLimit {
		limit = maxUpcomingLimit
	}
	return u.repo.ListUpcoming(userID, limit)
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

// Update mutates trip metadata. When the date range changes, days are
// regenerated atomically: old days deleted, new days inserted.
func (u *Usecase) Update(ctx context.Context, userID, tripID string, in UpdateInput) (*Trip, error) {
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
	if err := validateFields(in.Title, in.Description, in.Notes, in.CoverImageURL); err != nil {
		return nil, err
	}
	if !currency.IsSupported(in.BaseCurrency) {
		return nil, ErrInvalidCurrency
	}
	if in.Budget != nil {
		if err := validateBudget(*in.Budget); err != nil {
			return nil, err
		}
	}

	// Loop 14: strip HTML tags from user-provided text before storing.
	in.Title = sanitize.Text(in.Title)
	in.Description = sanitize.Text(in.Description)
	in.Notes = sanitize.Text(in.Notes)

	datesChanged := !existing.StartDate.Equal(in.StartDate) || !existing.EndDate.Equal(in.EndDate)

	existing.Title = in.Title
	existing.Description = in.Description
	existing.StartDate = in.StartDate
	existing.EndDate = in.EndDate
	existing.BaseCurrency = in.BaseCurrency
	if in.Budget != nil {
		existing.Budget = *in.Budget
	}
	existing.CoverImageURL = in.CoverImageURL
	existing.Notes = in.Notes

	if !datesChanged {
		return u.repo.Update(existing)
	}

	// Dates changed: wrap trip update + day regeneration in a single transaction
	// so the trip row and its days stay consistent (Phase 3D / Iter 8).
	tx, err := u.repo.BeginTx(ctx)
	if err != nil {
		return nil, fmt.Errorf("trip.usecase.Update: begin tx: %w", err)
	}
	defer u.repo.Rollback(ctx, tx)

	updated, err := u.repo.UpdateTx(ctx, tx, existing)
	if err != nil {
		return nil, fmt.Errorf("trip.usecase.Update: update trip in tx: %w", err)
	}

	if err := u.repo.DeleteDays(ctx, tx, tripID); err != nil {
		return nil, err
	}
	newDays := generateDays(tripID, in.StartDate, in.EndDate)
	if err := u.repo.InsertDays(ctx, tx, newDays); err != nil {
		return nil, err
	}

	if err := u.repo.Commit(ctx, tx); err != nil {
		return nil, err
	}
	return updated, nil
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

// UpdateDayNotes mutates only the notes column on a single day.
// Ownership chain day → trip → user verified via FindDayOwner JOIN.
func (u *Usecase) UpdateDayNotes(userID, dayID, notes string) (*Day, error) {
	owner, err := u.repo.FindDayOwner(dayID)
	if err != nil {
		return nil, err
	}
	if owner != userID {
		return nil, apperr.ErrForbidden
	}
	return u.repo.UpdateDayNotes(dayID, notes)
}

func validateDates(start, end time.Time) error {
	if start.IsZero() || end.IsZero() {
		return ErrInvalidDates
	}
	if end.Before(start) {
		return ErrInvalidDates
	}
	// Loop 3: prevent trips spanning more than maxTripDurationDays.
	if end.Sub(start) > time.Duration(maxTripDurationDays)*24*time.Hour {
		return ErrTripTooLong
	}
	return nil
}

// validateFields enforces length limits on user-provided text fields (Loop 4).
// This prevents excessively large inputs from reaching the database.
func validateFields(title, description, notes, coverURL string) error {
	if len(strings.TrimSpace(title)) < minTitleLength {
		return ErrEmptyTitle
	}
	if len(title) > maxTitleLength {
		return ErrTitleTooLong
	}
	if len(description) > maxDescriptionLength {
		return ErrDescriptionTooLong
	}
	if len(notes) > maxNotesLength {
		return ErrNotesTooLong
	}
	if len(coverURL) > maxCoverImageURLLen {
		return ErrURLTooLong
	}
	return nil
}

// validateBudget rejects negative budget values. Zero is allowed (no budget set).
func validateBudget(budget float64) error {
	if budget < 0 {
		return ErrInvalidBudget
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
