package trip

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/jhontea/navisha/backend/internal/apperr"
)

// ---------- pure helpers ----------

func TestGenerateDays(t *testing.T) {
	tests := []struct {
		name      string
		start     time.Time
		end       time.Time
		wantCount int
		wantNums  []int
	}{
		{"single day", date(2026, 6, 10), date(2026, 6, 10), 1, []int{1}},
		{"three days", date(2026, 6, 10), date(2026, 6, 12), 3, []int{1, 2, 3}},
		{"week", date(2026, 6, 10), date(2026, 6, 16), 7, []int{1, 2, 3, 4, 5, 6, 7}},
		{"end before start", date(2026, 6, 12), date(2026, 6, 10), 0, nil},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := generateDays("trip-1", tc.start, tc.end)
			if len(got) != tc.wantCount {
				t.Fatalf("got %d days, want %d", len(got), tc.wantCount)
			}
			for i, d := range got {
				if d.DayNumber != tc.wantNums[i] {
					t.Errorf("day[%d].DayNumber = %d, want %d", i, d.DayNumber, tc.wantNums[i])
				}
				if d.TripID != "trip-1" {
					t.Errorf("day[%d].TripID = %q, want trip-1", i, d.TripID)
				}
				wantDate := tc.start.AddDate(0, 0, i)
				if !d.Date.Equal(wantDate) {
					t.Errorf("day[%d].Date = %v, want %v", i, d.Date, wantDate)
				}
			}
		})
	}
}

func TestValidateDates(t *testing.T) {
	valid := date(2026, 6, 10)
	tests := []struct {
		name    string
		start   time.Time
		end     time.Time
		wantErr error
	}{
		{"valid range", valid, valid.AddDate(0, 0, 3), nil},
		{"same day", valid, valid, nil},
		{"end before start", valid, valid.AddDate(0, 0, -1), ErrInvalidDates},
		{"zero start", time.Time{}, valid, ErrInvalidDates},
		{"zero end", valid, time.Time{}, ErrInvalidDates},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := validateDates(tc.start, tc.end)
			if !errors.Is(err, tc.wantErr) {
				t.Errorf("err = %v, want %v", err, tc.wantErr)
			}
		})
	}
}

func TestValidateBudgetCategories(t *testing.T) {
	tests := []struct {
		name       string
		categories map[string]float64
		total      float64
		wantErr    error
	}{
		{name: "valid allocation", categories: map[string]float64{"food": 200, "activity": 300}, total: 1000},
		{name: "zero total allows empty allocations", categories: map[string]float64{}, total: 0},
		{name: "negative category", categories: map[string]float64{"food": -1}, total: 1000, wantErr: ErrInvalidBudget},
		{name: "unknown category", categories: map[string]float64{"gifts": 100}, total: 1000, wantErr: ErrInvalidBudgetCategory},
		{name: "allocation exceeds total", categories: map[string]float64{"food": 600, "activity": 500}, total: 1000, wantErr: ErrInvalidBudget},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := validateBudgetCategories(tc.categories, tc.total)
			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("err = %v, want %v", err, tc.wantErr)
			}
		})
	}
}

// ---------- Create ----------

func TestUsecase_Create_Success(t *testing.T) {
	setupCurrencies()
	repo := newMockRepo()
	u := NewUsecase(repo, &mockRebaser{})

	in := CreateInput{
		Title:        "Bali trip",
		StartDate:    date(2026, 7, 1),
		EndDate:      date(2026, 7, 3),
		BaseCurrency: "IDR",
	}
	got, err := u.Create(context.Background(), "user-1", in)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	if got.ID != "new-trip-id" {
		t.Errorf("trip ID = %q, want new-trip-id", got.ID)
	}
	if got.UserID != "user-1" {
		t.Errorf("trip UserID = %q, want user-1", got.UserID)
	}
	if len(repo.insertedDays) != 3 {
		t.Errorf("inserted %d days, want 3", len(repo.insertedDays))
	}
	if repo.beginTxCalls != 1 || repo.commitCalls != 1 {
		t.Errorf("tx calls: begin=%d commit=%d rollback=%d, want begin=1 commit=1",
			repo.beginTxCalls, repo.commitCalls, repo.rollbackCalls)
	}
}

func TestUsecase_Create_InvalidCurrency(t *testing.T) {
	setupCurrencies()
	repo := newMockRepo()
	u := NewUsecase(repo, &mockRebaser{})

	in := CreateInput{
		Title:        "x",
		StartDate:    date(2026, 7, 1),
		EndDate:      date(2026, 7, 3),
		BaseCurrency: "EUR",
	}
	_, err := u.Create(context.Background(), "user-1", in)
	if !errors.Is(err, ErrInvalidCurrency) {
		t.Fatalf("err = %v, want ErrInvalidCurrency", err)
	}
	if repo.beginTxCalls != 0 {
		t.Errorf("BeginTx called %d times before validation, want 0", repo.beginTxCalls)
	}
}

func TestUsecase_Create_InvalidDates(t *testing.T) {
	setupCurrencies()
	repo := newMockRepo()
	u := NewUsecase(repo, &mockRebaser{})

	in := CreateInput{
		Title:        "x",
		StartDate:    date(2026, 7, 3),
		EndDate:      date(2026, 7, 1),
		BaseCurrency: "IDR",
	}
	_, err := u.Create(context.Background(), "user-1", in)
	if !errors.Is(err, ErrInvalidDates) {
		t.Fatalf("err = %v, want ErrInvalidDates", err)
	}
}

func TestUsecase_Create_InsertDaysFails_RollsBack(t *testing.T) {
	setupCurrencies()
	repo := newMockRepo()
	repo.insertDaysErr = errors.New("db error")
	u := NewUsecase(repo, &mockRebaser{})

	in := CreateInput{
		Title:        "x",
		StartDate:    date(2026, 7, 1),
		EndDate:      date(2026, 7, 3),
		BaseCurrency: "IDR",
	}
	_, err := u.Create(context.Background(), "user-1", in)
	if err == nil {
		t.Fatal("expected error")
	}
	if repo.commitCalls != 0 {
		t.Errorf("commit called on failure, want 0")
	}
	if repo.rollbackCalls == 0 {
		t.Error("rollback not called on failure")
	}
}

// ---------- Ownership checks ----------

func TestUsecase_Get_Forbidden(t *testing.T) {
	repo := newMockRepo()
	repo.trips["t1"] = &Trip{ID: "t1", UserID: "user-other"}
	u := NewUsecase(repo, &mockRebaser{})

	_, _, err := u.Get(context.Background(), "user-1", "t1")
	if !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestUsecase_Get_Success(t *testing.T) {
	repo := newMockRepo()
	repo.trips["t1"] = &Trip{ID: "t1", UserID: "user-1"}
	repo.listDaysResult = []Day{{ID: "d1", TripID: "t1", DayNumber: 1}}
	u := NewUsecase(repo, &mockRebaser{})

	tr, days, err := u.Get(context.Background(), "user-1", "t1")
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if tr.ID != "t1" {
		t.Errorf("trip ID = %q, want t1", tr.ID)
	}
	if len(days) != 1 {
		t.Errorf("got %d days, want 1", len(days))
	}
}

func TestUsecase_Update_Forbidden(t *testing.T) {
	setupCurrencies()
	repo := newMockRepo()
	repo.trips["t1"] = &Trip{ID: "t1", UserID: "user-other"}
	u := NewUsecase(repo, &mockRebaser{})

	_, err := u.Update(context.Background(), "user-1", "t1", UpdateInput{
		Title:        "x",
		StartDate:    date(2026, 7, 1),
		EndDate:      date(2026, 7, 3),
		BaseCurrency: "IDR",
	})
	if !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

// Regression: updating a trip without supplying a budget must NOT wipe the
// existing budget. A nil UpdateInput.Budget means "leave unchanged".
func TestUsecase_Update_OmittedBudgetPreservesExisting(t *testing.T) {
	setupCurrencies()
	repo := newMockRepo()
	repo.trips["t1"] = &Trip{
		ID: "t1", UserID: "user-1",
		StartDate: date(2026, 7, 1), EndDate: date(2026, 7, 3),
		BaseCurrency: "IDR", Budget: 5_000_000,
	}
	u := NewUsecase(repo, &mockRebaser{})

	got, err := u.Update(context.Background(), "user-1", "t1", UpdateInput{
		Title:        "renamed",
		StartDate:    date(2026, 7, 1),
		EndDate:      date(2026, 7, 3),
		BaseCurrency: "IDR",
		// Budget intentionally nil
	})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if got.Budget != 5_000_000 {
		t.Errorf("Budget = %v, want 5000000 (should be preserved)", got.Budget)
	}
}

// An explicit zero budget should still clear the budget.
func TestUsecase_Update_ExplicitBudgetZero(t *testing.T) {
	setupCurrencies()
	repo := newMockRepo()
	repo.trips["t1"] = &Trip{
		ID: "t1", UserID: "user-1",
		StartDate: date(2026, 7, 1), EndDate: date(2026, 7, 3),
		BaseCurrency: "IDR", Budget: 5_000_000,
	}
	u := NewUsecase(repo, &mockRebaser{})

	zero := 0.0
	got, err := u.Update(context.Background(), "user-1", "t1", UpdateInput{
		Title:        "x",
		StartDate:    date(2026, 7, 1),
		EndDate:      date(2026, 7, 3),
		BaseCurrency: "IDR",
		Budget:       &zero,
	})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if got.Budget != 0 {
		t.Errorf("Budget = %v, want 0", got.Budget)
	}
}

// Changing the base currency must reconvert expenses in the same
// transaction as the trip update (bug A1.1: totals labelled with the new
// currency but summed in the old one).
func TestUsecase_Update_CurrencyChangeRebasesExpenses(t *testing.T) {
	setupCurrencies()
	repo := newMockRepo()
	repo.trips["t1"] = &Trip{
		ID: "t1", UserID: "user-1",
		StartDate: date(2026, 7, 1), EndDate: date(2026, 7, 3),
		BaseCurrency: "IDR",
	}
	rebaser := &mockRebaser{}
	u := NewUsecase(repo, rebaser)

	got, err := u.Update(context.Background(), "user-1", "t1", UpdateInput{
		Title:        "x",
		StartDate:    date(2026, 7, 1),
		EndDate:      date(2026, 7, 3),
		BaseCurrency: "USD",
	})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if got.BaseCurrency != "USD" {
		t.Errorf("BaseCurrency = %q, want USD", got.BaseCurrency)
	}
	if len(rebaser.calls) != 1 || rebaser.calls[0] != "t1→USD" {
		t.Errorf("rebase calls = %v, want [t1→USD]", rebaser.calls)
	}
	if repo.beginTxCalls != 1 || repo.commitCalls != 1 {
		t.Errorf("tx begin/commit = %d/%d, want 1/1", repo.beginTxCalls, repo.commitCalls)
	}
	if repo.resizeCalls != nil {
		t.Errorf("days resized although dates did not change")
	}
}

func TestUsecase_Update_RebaseFailsDoesNotCommit(t *testing.T) {
	setupCurrencies()
	repo := newMockRepo()
	repo.trips["t1"] = &Trip{
		ID: "t1", UserID: "user-1",
		StartDate: date(2026, 7, 1), EndDate: date(2026, 7, 3),
		BaseCurrency: "IDR",
	}
	rebaseErr := errors.New("rates unavailable")
	u := NewUsecase(repo, &mockRebaser{err: rebaseErr})

	_, err := u.Update(context.Background(), "user-1", "t1", UpdateInput{
		Title:        "x",
		StartDate:    date(2026, 7, 1),
		EndDate:      date(2026, 7, 3),
		BaseCurrency: "USD",
	})
	if !errors.Is(err, rebaseErr) {
		t.Fatalf("err = %v, want rebase error", err)
	}
	if repo.commitCalls != 0 {
		t.Errorf("commit called %d times, want 0", repo.commitCalls)
	}
	if repo.rollbackCalls == 0 {
		t.Errorf("rollback not called")
	}
}

func TestUsecase_Update_SameCurrencySkipsRebase(t *testing.T) {
	setupCurrencies()
	repo := newMockRepo()
	repo.trips["t1"] = &Trip{
		ID: "t1", UserID: "user-1",
		StartDate: date(2026, 7, 1), EndDate: date(2026, 7, 3),
		BaseCurrency: "IDR",
	}
	rebaser := &mockRebaser{}
	u := NewUsecase(repo, rebaser)

	if _, err := u.Update(context.Background(), "user-1", "t1", UpdateInput{
		Title:        "x",
		StartDate:    date(2026, 7, 1),
		EndDate:      date(2026, 7, 3),
		BaseCurrency: "IDR",
	}); err != nil {
		t.Fatalf("Update: %v", err)
	}
	if len(rebaser.calls) != 0 {
		t.Errorf("rebase called %v, want none", rebaser.calls)
	}
	if repo.beginTxCalls != 0 {
		t.Errorf("tx opened although nothing structural changed")
	}
}

func TestUsecase_Delete_Forbidden(t *testing.T) {
	repo := newMockRepo()
	repo.trips["t1"] = &Trip{ID: "t1", UserID: "user-other"}
	u := NewUsecase(repo, &mockRebaser{})

	err := u.Delete(context.Background(), "user-1", "t1")
	if !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestUsecase_Delete_Success(t *testing.T) {
	repo := newMockRepo()
	repo.trips["t1"] = &Trip{ID: "t1", UserID: "user-1"}
	u := NewUsecase(repo, &mockRebaser{})

	if err := u.Delete(context.Background(), "user-1", "t1"); err != nil {
		t.Errorf("Delete: %v", err)
	}
}

// ---------- UpdateDayNotes ----------

func TestUsecase_UpdateDayNotes_Success(t *testing.T) {
	repo := newMockRepo()
	repo.dayOwners["d1"] = "user-1"
	u := NewUsecase(repo, &mockRebaser{})

	d, err := u.UpdateDayNotes(context.Background(), "user-1", "d1", "remember sunscreen")
	if err != nil {
		t.Fatalf("UpdateDayNotes: %v", err)
	}
	if d.Notes != "remember sunscreen" {
		t.Errorf("notes = %q, want remember sunscreen", d.Notes)
	}
}

func TestUsecase_UpdateDayNotes_Forbidden(t *testing.T) {
	repo := newMockRepo()
	repo.dayOwners["d1"] = "user-other"
	u := NewUsecase(repo, &mockRebaser{})

	_, err := u.UpdateDayNotes(context.Background(), "user-1", "d1", "x")
	if !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestUsecase_UpdateDayNotes_DayNotFound(t *testing.T) {
	repo := newMockRepo()
	u := NewUsecase(repo, &mockRebaser{})

	_, err := u.UpdateDayNotes(context.Background(), "user-1", "missing", "x")
	if !errors.Is(err, ErrDayNotFound) {
		t.Errorf("err = %v, want ErrDayNotFound", err)
	}
}

// ---------- UpdateDayTitle ----------

func TestUsecase_UpdateDayTitle_Success(t *testing.T) {
	repo := newMockRepo()
	repo.dayOwners["d1"] = "user-1"
	u := NewUsecase(repo, &mockRebaser{})

	d, err := u.UpdateDayTitle(context.Background(), "user-1", "d1", "  Shibuya & Harajuku  ")
	if err != nil {
		t.Fatalf("UpdateDayTitle: %v", err)
	}
	if d.Title != "Shibuya & Harajuku" {
		t.Errorf("title = %q, want Shibuya & Harajuku", d.Title)
	}
}

func TestUsecase_UpdateDayTitle_Forbidden(t *testing.T) {
	repo := newMockRepo()
	repo.dayOwners["d1"] = "user-other"
	u := NewUsecase(repo, &mockRebaser{})

	_, err := u.UpdateDayTitle(context.Background(), "user-1", "d1", "Arrival Day")
	if !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestUsecase_UpdateDayTitle_TooLong(t *testing.T) {
	u := NewUsecase(newMockRepo(), &mockRebaser{})

	_, err := u.UpdateDayTitle(context.Background(), "user-1", "d1", strings.Repeat("a", maxDayTitleLength+1))
	if !errors.Is(err, ErrDayTitleTooLong) {
		t.Errorf("err = %v, want ErrDayTitleTooLong", err)
	}
}

// ---------- List limit clamping ----------

func TestUsecase_List_LimitClamping(t *testing.T) {
	tests := []struct {
		name    string
		inLimit int
	}{
		{"zero defaults", 0},
		{"negative defaults", -5},
		{"too big clamps", 1000},
		{"within range", 15},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := newMockRepo()
			u := NewUsecase(repo, &mockRebaser{})
			if _, err := u.List(context.Background(), "user-1", "", tc.inLimit); err != nil {
				t.Errorf("List: %v", err)
			}
		})
	}
}

func TestUsecase_Update_DatesChangeResizesDays(t *testing.T) {
	setupCurrencies()
	repo := newMockRepo()
	repo.trips["t1"] = &Trip{ID: "t1", UserID: "user-1", StartDate: date(2026, 7, 1), EndDate: date(2026, 7, 3), BaseCurrency: "IDR"}
	u := NewUsecase(repo, &mockRebaser{})

	if _, err := u.Update(context.Background(), "user-1", "t1", UpdateInput{
		Title: "x", StartDate: date(2026, 7, 1), EndDate: date(2026, 7, 5), BaseCurrency: "IDR",
	}); err != nil {
		t.Fatalf("Update: %v", err)
	}
	if len(repo.resizeCalls) != 1 || repo.resizeCalls[0] != "t1:2026-07-01..2026-07-05" {
		t.Errorf("resize calls = %v", repo.resizeCalls)
	}
	if repo.commitCalls != 1 {
		t.Errorf("commit calls = %d, want 1", repo.commitCalls)
	}
}

func TestUsecase_Update_DroppedDaysWithActivitiesRejected(t *testing.T) {
	setupCurrencies()
	repo := newMockRepo()
	repo.trips["t1"] = &Trip{ID: "t1", UserID: "user-1", StartDate: date(2026, 7, 1), EndDate: date(2026, 7, 5), BaseCurrency: "IDR"}
	repo.resizeErr = ErrDaysHaveActivities
	u := NewUsecase(repo, &mockRebaser{})

	_, err := u.Update(context.Background(), "user-1", "t1", UpdateInput{
		Title: "x", StartDate: date(2026, 7, 1), EndDate: date(2026, 7, 3), BaseCurrency: "IDR",
	})
	if !errors.Is(err, ErrDaysHaveActivities) {
		t.Fatalf("err = %v, want ErrDaysHaveActivities", err)
	}
	if repo.commitCalls != 0 {
		t.Errorf("committed although the resize was rejected")
	}
}

func TestUsecase_Update_CurrencyChangeConvertsUnchangedBudget(t *testing.T) {
	setupCurrencies()
	repo := newMockRepo()
	repo.trips["t1"] = &Trip{
		ID: "t1", UserID: "user-1", StartDate: date(2026, 7, 1), EndDate: date(2026, 7, 3), BaseCurrency: "IDR",
		Budget: 16_000_000, BudgetCategories: map[string]float64{"food": 3_200_000},
	}
	u := NewUsecase(repo, &mockRebaser{})
	budget := 16_000_000.0

	got, err := u.Update(context.Background(), "user-1", "t1", UpdateInput{
		Title: "x", StartDate: date(2026, 7, 1), EndDate: date(2026, 7, 3), BaseCurrency: "USD",
		Budget: &budget, BudgetCategories: map[string]float64{"food": 3_200_000},
	})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if got.Budget != 1000 || got.BudgetCategories["food"] != 200 {
		t.Errorf("budget = %v, categories = %v, want 1000 and food 200", got.Budget, got.BudgetCategories)
	}
}

func TestUsecase_Update_CurrencyChangeKeepsTypedBudget(t *testing.T) {
	setupCurrencies()
	repo := newMockRepo()
	repo.trips["t1"] = &Trip{ID: "t1", UserID: "user-1", StartDate: date(2026, 7, 1), EndDate: date(2026, 7, 3), BaseCurrency: "IDR", Budget: 16_000_000}
	u := NewUsecase(repo, &mockRebaser{})
	typed := 900.0

	got, err := u.Update(context.Background(), "user-1", "t1", UpdateInput{
		Title: "x", StartDate: date(2026, 7, 1), EndDate: date(2026, 7, 3), BaseCurrency: "USD", Budget: &typed,
	})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if got.Budget != 900 {
		t.Errorf("budget = %v, want the typed 900", got.Budget)
	}
}

func TestValidateDates_NinetyDayLimitIsInclusive(t *testing.T) {
	start := date(2026, 1, 1)
	if err := validateDates(start, start.AddDate(0, 0, 89)); err != nil {
		t.Errorf("90 days (Jan 1 – Mar 31) rejected: %v", err)
	}
	if err := validateDates(start, start.AddDate(0, 0, 90)); !errors.Is(err, ErrTripTooLong) {
		t.Errorf("91 days accepted, err = %v", err)
	}
}

func TestUsecase_Create_DayContentFillsDaysByPosition(t *testing.T) {
	setupCurrencies()
	repo := newMockRepo()
	u := NewUsecase(repo, &mockRebaser{})

	in := []DayContent{{Title: " Arrive ", Notes: "n1"}, {}, {Title: "Leave", Notes: "<b>n3</b>"}}
	_, err := u.Create(context.Background(), "user-1", CreateInput{
		Title: "x", StartDate: date(2026, 7, 1), EndDate: date(2026, 7, 3), BaseCurrency: "IDR", Days: in,
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if in[0].Title != " Arrive " {
		t.Errorf("caller's slice was rewritten: %q", in[0].Title)
	}
	got := repo.insertedDays
	if len(got) != 3 || got[0].Title != "Arrive" || got[0].Notes != "n1" ||
		got[1].Title != "" || got[2].Title != "Leave" || got[2].Notes != "n3" {
		t.Errorf("days = %+v", got)
	}
}

func TestUsecase_Create_WithoutDayContentLeavesDaysEmpty(t *testing.T) {
	setupCurrencies()
	repo := newMockRepo()
	u := NewUsecase(repo, &mockRebaser{})

	if _, err := u.Create(context.Background(), "user-1", CreateInput{
		Title: "x", StartDate: date(2026, 7, 1), EndDate: date(2026, 7, 2), BaseCurrency: "IDR",
	}); err != nil {
		t.Fatalf("Create: %v", err)
	}
	for _, d := range repo.insertedDays {
		if d.Title != "" || d.Notes != "" {
			t.Errorf("day %d = %+v, want empty title/notes", d.DayNumber, d)
		}
	}
}

func TestUsecase_Create_DayTitleTooLong(t *testing.T) {
	setupCurrencies()
	repo := newMockRepo()
	u := NewUsecase(repo, &mockRebaser{})

	_, err := u.Create(context.Background(), "user-1", CreateInput{
		Title: "x", StartDate: date(2026, 7, 1), EndDate: date(2026, 7, 1), BaseCurrency: "IDR",
		Days: []DayContent{{Title: strings.Repeat("a", maxDayTitleLength+1)}},
	})
	if !errors.Is(err, ErrDayTitleTooLong) {
		t.Fatalf("err = %v, want ErrDayTitleTooLong", err)
	}
	if repo.beginTxCalls != 0 {
		t.Errorf("BeginTx called before validation")
	}
}
