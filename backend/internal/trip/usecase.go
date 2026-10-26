package trip

import (
	"context"
	"fmt"
	"maps"
	"math"
	"slices"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jhontea/navisha/backend/internal/apperr"
	"github.com/jhontea/navisha/backend/internal/currency"
	"github.com/jhontea/navisha/backend/pkg/dbtx"
	"github.com/jhontea/navisha/backend/pkg/sanitize"
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
	maxDayTitleLength    = 80
)

type UsecaseInterface interface {
	Create(ctx context.Context, userID string, in CreateInput) (*Trip, error)
	List(ctx context.Context, userID, cursor string, limit int) (ListResult, error)
	ListFiltered(ctx context.Context, userID, cursor string, limit int, from, to string) (ListResult, error)
	ListUpcoming(ctx context.Context, userID string, limit int) ([]Trip, error)
	Get(ctx context.Context, userID, tripID string) (*Trip, []Day, error)
	Update(ctx context.Context, userID, tripID string, in UpdateInput) (*Trip, error)
	Delete(ctx context.Context, userID, tripID string) error
	UpdateDayTitle(ctx context.Context, userID, dayID, title string) (*Day, error)
	UpdateDayNotes(ctx context.Context, userID, dayID, notes string) (*Day, error)
}

type CreateInput struct {
	Title            string
	Description      string
	StartDate        time.Time
	EndDate          time.Time
	BaseCurrency     string
	Budget           float64
	BudgetCategories map[string]float64
	CoverImageURL    string
	Notes            string
	// Days optionally fills the generated days by position (Days[0] is day 1),
	// used when duplicating a trip. Extra entries are ignored.
	Days []DayContent
}

// DayContent is the user-written part of a day.
type DayContent struct {
	Title string
	Notes string
}

type UpdateInput struct {
	Title            string
	Description      string
	StartDate        time.Time
	EndDate          time.Time
	BaseCurrency     string
	Budget           *float64           // nil = leave unchanged; &0.0 = explicitly clear
	BudgetCategories map[string]float64 // nil = leave unchanged
	CoverImageURL    string
	Notes            string
}

// ExpenseRebaser reconverts a trip's expenses into a new base currency inside
// the caller's transaction. Satisfied by *expense.Usecase; defined here so
// trip does not import expense.
type ExpenseRebaser interface {
	RebaseTx(ctx context.Context, tx pgx.Tx, tripID, newBase string) error
	// ConvertAmount converts one amount with the cached rates (used for the budget).
	ConvertAmount(ctx context.Context, from, to string, amount float64) (float64, error)
}

type Usecase struct {
	repo    Repository
	rebaser ExpenseRebaser
}

func NewUsecase(repo Repository, rebaser ExpenseRebaser) *Usecase {
	return &Usecase{repo: repo, rebaser: rebaser}
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
	if err := validateBudgetCategories(in.BudgetCategories, in.Budget); err != nil {
		return nil, err
	}
	in.Days = slices.Clone(in.Days) // don't rewrite the caller's slice
	for i := range in.Days {
		// Same rules as UpdateDayTitle and the day-notes handler.
		title, err := normalizeDayTitle(in.Days[i].Title)
		if err != nil {
			return nil, err
		}
		if sanitize.TooLong(in.Days[i].Notes, maxNotesLength) {
			return nil, ErrNotesTooLong
		}
		in.Days[i].Title, in.Days[i].Notes = title, sanitize.Text(in.Days[i].Notes)
	}

	// Loop 14: strip HTML tags from user-provided text before storing.
	in.Title = sanitize.Text(in.Title)
	in.Description = sanitize.Text(in.Description)
	in.Notes = sanitize.Text(in.Notes)

	t := &Trip{
		UserID:           userID,
		Title:            in.Title,
		Description:      in.Description,
		StartDate:        in.StartDate,
		EndDate:          in.EndDate,
		BaseCurrency:     in.BaseCurrency,
		Budget:           in.Budget,
		BudgetCategories: in.BudgetCategories,
		CoverImageURL:    in.CoverImageURL,
		Notes:            in.Notes,
	}

	var created *Trip
	err := dbtx.WithTx(ctx, u.repo, func(tx pgx.Tx) error {
		var err error
		if created, err = u.repo.InsertTrip(ctx, tx, t); err != nil {
			return fmt.Errorf("trip.usecase.Create insert trip: %w", err)
		}
		days := generateDays(created.ID, created.StartDate, created.EndDate)
		for i := range days {
			if i < len(in.Days) {
				days[i].Title, days[i].Notes = in.Days[i].Title, in.Days[i].Notes
			}
		}
		if err := u.repo.InsertDays(ctx, tx, days); err != nil {
			return fmt.Errorf("trip.usecase.Create insert days: %w", err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return created, nil
}

func (u *Usecase) List(ctx context.Context, userID, cursor string, limit int) (ListResult, error) {
	if limit <= 0 {
		limit = defaultListLimit
	}
	if limit > maxListLimit {
		limit = maxListLimit
	}
	return u.repo.List(ctx, userID, cursor, limit)
}

// ListFiltered returns trips with optional date-range filter + cursor pagination.
// from/to are YYYY-MM-DD strings; empty string means no bound.
func (u *Usecase) ListFiltered(ctx context.Context, userID, cursor string, limit int, from, to string) (ListResult, error) {
	if limit <= 0 {
		limit = 12
	}
	if limit > maxListLimit {
		limit = maxListLimit
	}
	return u.repo.ListFiltered(ctx, userID, cursor, limit, from, to)
}

// ListUpcoming returns trips whose end_date >= today (active + upcoming),
// ordered by start_date ASC (soonest first), default and max 6.
func (u *Usecase) ListUpcoming(ctx context.Context, userID string, limit int) ([]Trip, error) {
	if limit <= 0 {
		limit = 6
	}
	// Cap upcoming trips to prevent oversized DB queries.
	const maxUpcomingLimit = 20
	if limit > maxUpcomingLimit {
		limit = maxUpcomingLimit
	}
	return u.repo.ListUpcoming(ctx, userID, limit)
}

// Get returns the trip with its days. Caller must own the trip.
func (u *Usecase) Get(ctx context.Context, userID, tripID string) (*Trip, []Day, error) {
	t, err := u.repo.FindByID(ctx, tripID)
	if err != nil {
		return nil, nil, err
	}
	if t.UserID != userID {
		return nil, nil, apperr.ErrForbidden
	}
	days, err := u.repo.ListDays(ctx, tripID)
	if err != nil {
		return nil, nil, err
	}
	return t, days, nil
}

// Update mutates trip metadata. When the date range changes, days are
// regenerated atomically: old days deleted, new days inserted.
func (u *Usecase) Update(ctx context.Context, userID, tripID string, in UpdateInput) (*Trip, error) {
	existing, err := u.repo.FindByID(ctx, tripID)
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
	if in.BudgetCategories != nil {
		budget := existing.Budget
		if in.Budget != nil {
			budget = *in.Budget
		}
		if err := validateBudgetCategories(in.BudgetCategories, budget); err != nil {
			return nil, err
		}
	}

	// Loop 14: strip HTML tags from user-provided text before storing.
	in.Title = sanitize.Text(in.Title)
	in.Description = sanitize.Text(in.Description)
	in.Notes = sanitize.Text(in.Notes)

	datesChanged := !existing.StartDate.Equal(in.StartDate) || !existing.EndDate.Equal(in.EndDate)
	currencyChanged := existing.BaseCurrency != in.BaseCurrency
	oldBase, oldBudget, oldCategories := existing.BaseCurrency, existing.Budget, existing.BudgetCategories

	existing.Title = in.Title
	existing.Description = in.Description
	existing.StartDate = in.StartDate
	existing.EndDate = in.EndDate
	existing.BaseCurrency = in.BaseCurrency
	if in.Budget != nil {
		existing.Budget = *in.Budget
	}
	if in.BudgetCategories != nil {
		existing.BudgetCategories = in.BudgetCategories
	}
	existing.CoverImageURL = in.CoverImageURL
	existing.Notes = in.Notes

	// The budget is stored in the base currency. The edit form resends it with
	// every save, so an unchanged number means "keep my budget" and is converted;
	// a number the user just changed is already in the new currency.
	if currencyChanged {
		if existing.Budget == oldBudget && oldBudget > 0 {
			if existing.Budget, err = u.convertBudget(ctx, oldBase, in.BaseCurrency, oldBudget); err != nil {
				return nil, err
			}
		}
		if len(oldCategories) > 0 && maps.Equal(existing.BudgetCategories, oldCategories) {
			converted := make(map[string]float64, len(oldCategories))
			for k, v := range oldCategories {
				if converted[k], err = u.convertBudget(ctx, oldBase, in.BaseCurrency, v); err != nil {
					return nil, err
				}
			}
			existing.BudgetCategories = converted
		}
	}

	if !datesChanged && !currencyChanged {
		return u.repo.Update(ctx, existing)
	}

	// Dates or base currency changed: wrap the trip update with day
	// regeneration and/or expense reconversion in a single transaction so the
	// trip row, its days and its expense totals stay consistent.
	var updated *Trip
	err = dbtx.WithTx(ctx, u.repo, func(tx pgx.Tx) error {
		var err error
		if updated, err = u.repo.UpdateTx(ctx, tx, existing); err != nil {
			return fmt.Errorf("trip.usecase.Update: update trip in tx: %w", err)
		}
		if datesChanged {
			if err := u.repo.ResizeDaysTx(ctx, tx, tripID, in.StartDate, in.EndDate); err != nil {
				return err
			}
		}
		if currencyChanged {
			if err := u.rebaser.RebaseTx(ctx, tx, tripID, in.BaseCurrency); err != nil {
				return fmt.Errorf("trip.usecase.Update: rebase expenses: %w", err)
			}
		}
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("trip.usecase.Update: %w", err)
	}
	return updated, nil
}

func (u *Usecase) Delete(ctx context.Context, userID, tripID string) error {
	existing, err := u.repo.FindByID(ctx, tripID)
	if err != nil {
		return err
	}
	if existing.UserID != userID {
		return apperr.ErrForbidden
	}
	return u.repo.Delete(ctx, tripID)
}

// UpdateDayNotes mutates only the notes column on a single day.
// Ownership chain day → trip → user verified via FindDayOwner JOIN.
func (u *Usecase) UpdateDayNotes(ctx context.Context, userID, dayID, notes string) (*Day, error) {
	owner, err := u.repo.FindDayOwner(ctx, dayID)
	if err != nil {
		return nil, err
	}
	if owner != userID {
		return nil, apperr.ErrForbidden
	}
	return u.repo.UpdateDayNotes(ctx, dayID, notes)
}

// UpdateDayTitle mutates the optional display title on a single day.
// Ownership chain day → trip → user is verified before the update.
func (u *Usecase) UpdateDayTitle(ctx context.Context, userID, dayID, title string) (*Day, error) {
	title, err := normalizeDayTitle(title)
	if err != nil {
		return nil, err
	}

	owner, err := u.repo.FindDayOwner(ctx, dayID)
	if err != nil {
		return nil, err
	}
	if owner != userID {
		return nil, apperr.ErrForbidden
	}
	return u.repo.UpdateDayTitle(ctx, dayID, title)
}

// normalizeDayTitle strips tags and spaces from a day title and checks its length.
func normalizeDayTitle(title string) (string, error) {
	title = strings.TrimSpace(sanitize.Text(title))
	if len(title) > maxDayTitleLength {
		return "", ErrDayTitleTooLong
	}
	return title, nil
}

func validateDates(start, end time.Time) error {
	if start.IsZero() || end.IsZero() {
		return ErrInvalidDates
	}
	if end.Before(start) {
		return ErrInvalidDates
	}
	// Loop 3: prevent trips spanning more than maxTripDurationDays.
	// Both ends count as trip days, so 90 days spans 89 days of difference.
	if end.Sub(start) >= time.Duration(maxTripDurationDays)*24*time.Hour {
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

func validateBudgetCategories(categories map[string]float64, totalBudget float64) error {
	if categories == nil {
		return nil
	}
	var total float64
	for category, amount := range categories {
		if !validBudgetCategory(category) {
			return ErrInvalidBudgetCategory
		}
		if amount < 0 {
			return ErrInvalidBudget
		}
		total += amount
	}
	if totalBudget > 0 && total > totalBudget {
		return ErrInvalidBudget
	}
	return nil
}

func validBudgetCategory(category string) bool {
	switch category {
	case "accommodation", "transport", "food", "activity", "souvenir", "shopping", "other":
		return true
	default:
		return false
	}
}

func (u *Usecase) convertBudget(ctx context.Context, from, to string, amount float64) (float64, error) {
	if amount == 0 {
		return 0, nil
	}
	v, err := u.rebaser.ConvertAmount(ctx, from, to, amount)
	if err != nil {
		return 0, fmt.Errorf("trip.usecase.Update: convert budget: %w", err)
	}
	return math.Round(v*100) / 100, nil
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
