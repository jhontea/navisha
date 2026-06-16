package trip

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/ahmadhafizh/navisha/backend/internal/apperr"
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

// ---------- Create ----------

func TestUsecase_Create_Success(t *testing.T) {
	setupCurrencies()
	repo := newMockRepo()
	u := NewUsecase(repo)

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
	u := NewUsecase(repo)

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
	u := NewUsecase(repo)

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
	u := NewUsecase(repo)

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
	u := NewUsecase(repo)

	_, _, err := u.Get("user-1", "t1")
	if !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestUsecase_Get_Success(t *testing.T) {
	repo := newMockRepo()
	repo.trips["t1"] = &Trip{ID: "t1", UserID: "user-1"}
	repo.listDaysResult = []Day{{ID: "d1", TripID: "t1", DayNumber: 1}}
	u := NewUsecase(repo)

	tr, days, err := u.Get("user-1", "t1")
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
	u := NewUsecase(repo)

	_, err := u.Update("user-1", "t1", UpdateInput{
		Title:        "x",
		StartDate:    date(2026, 7, 1),
		EndDate:      date(2026, 7, 3),
		BaseCurrency: "IDR",
	})
	if !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestUsecase_Delete_Forbidden(t *testing.T) {
	repo := newMockRepo()
	repo.trips["t1"] = &Trip{ID: "t1", UserID: "user-other"}
	u := NewUsecase(repo)

	err := u.Delete("user-1", "t1")
	if !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestUsecase_Delete_Success(t *testing.T) {
	repo := newMockRepo()
	repo.trips["t1"] = &Trip{ID: "t1", UserID: "user-1"}
	u := NewUsecase(repo)

	if err := u.Delete("user-1", "t1"); err != nil {
		t.Errorf("Delete: %v", err)
	}
}

// ---------- UpdateDayNotes ----------

func TestUsecase_UpdateDayNotes_Success(t *testing.T) {
	repo := newMockRepo()
	repo.dayOwners["d1"] = "user-1"
	u := NewUsecase(repo)

	d, err := u.UpdateDayNotes("user-1", "d1", "remember sunscreen")
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
	u := NewUsecase(repo)

	_, err := u.UpdateDayNotes("user-1", "d1", "x")
	if !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestUsecase_UpdateDayNotes_DayNotFound(t *testing.T) {
	repo := newMockRepo()
	u := NewUsecase(repo)

	_, err := u.UpdateDayNotes("user-1", "missing", "x")
	if !errors.Is(err, ErrDayNotFound) {
		t.Errorf("err = %v, want ErrDayNotFound", err)
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
			u := NewUsecase(repo)
			if _, err := u.List("user-1", "", tc.inLimit); err != nil {
				t.Errorf("List: %v", err)
			}
		})
	}
}
