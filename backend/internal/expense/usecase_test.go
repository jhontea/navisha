package expense

import (
	"errors"
	"testing"

	"github.com/ahmadhafizh/navisha/backend/internal/apperr"
)

func TestCategoryValid(t *testing.T) {
	tests := []struct {
		in   Category
		want bool
	}{
		{CategoryFood, true},
		{CategoryAccommodation, true},
		{CategoryTransport, true},
		{CategoryActivity, true},
		{CategoryOther, true},
		{"", false},
		{"bogus", false},
	}
	for _, tc := range tests {
		if got := tc.in.Valid(); got != tc.want {
			t.Errorf("Category(%q).Valid() = %v, want %v", tc.in, got, tc.want)
		}
	}
}

func TestValidateInput(t *testing.T) {
	tests := []struct {
		name     string
		title    string
		amount   float64
		currency string
		cat      Category
		wantErr  error
	}{
		{"valid", "Lunch", 10, "USD", CategoryFood, nil},
		{"empty title", "", 10, "USD", CategoryFood, errSentinel{}},
		{"zero amount", "x", 0, "USD", CategoryFood, errSentinel{}},
		{"negative amount", "x", -1, "USD", CategoryFood, errSentinel{}},
		{"empty currency", "x", 10, "", CategoryFood, ErrInvalidCurrency},
		{"invalid category", "x", 10, "USD", "bogus", ErrInvalidCategory},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := validateInput(tc.title, tc.amount, tc.currency, tc.cat)
			if tc.wantErr == nil {
				if err != nil {
					t.Errorf("got err %v, want nil", err)
				}
				return
			}
			if _, sentinel := tc.wantErr.(errSentinel); sentinel {
				if err == nil {
					t.Error("expected any error, got nil")
				}
				return
			}
			if !errors.Is(err, tc.wantErr) {
				t.Errorf("err = %v, want %v", err, tc.wantErr)
			}
		})
	}
}

// errSentinel signals "any error acceptable" without using a real value.
type errSentinel struct{}

func (errSentinel) Error() string { return "any" }

// ---------- Create ----------

func TestCreate_Success(t *testing.T) {
	repo := newMockRepo()
	repo.trips["trip-1"] = tripMeta{owner: "user-1", base: "IDR"}
	u := NewUsecase(repo, &mockConverter{rate: 15500.0})

	e, err := u.Create("user-1", "trip-1", CreateInput{
		Title: "Coffee", Amount: 5, Currency: "USD", Category: CategoryFood,
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if e.ConvertedAmount != 5*15500.0 {
		t.Errorf("converted = %v, want %v", e.ConvertedAmount, 5*15500.0)
	}
	if e.BaseCurrency != "IDR" {
		t.Errorf("base = %q, want IDR", e.BaseCurrency)
	}
	if e.Currency != "USD" {
		t.Errorf("currency = %q, want USD", e.Currency)
	}
}

func TestCreate_Forbidden(t *testing.T) {
	repo := newMockRepo()
	repo.trips["trip-1"] = tripMeta{owner: "user-other", base: "IDR"}
	u := NewUsecase(repo, &mockConverter{rate: 1})

	_, err := u.Create("user-1", "trip-1", CreateInput{
		Title: "x", Amount: 5, Currency: "USD", Category: CategoryFood,
	})
	if !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestCreate_TripNotFound(t *testing.T) {
	repo := newMockRepo()
	u := NewUsecase(repo, &mockConverter{rate: 1})

	_, err := u.Create("user-1", "missing", CreateInput{
		Title: "x", Amount: 5, Currency: "USD", Category: CategoryFood,
	})
	if !errors.Is(err, ErrTripNotFound) {
		t.Errorf("err = %v, want ErrTripNotFound", err)
	}
}

func TestCreate_ConverterFails(t *testing.T) {
	repo := newMockRepo()
	repo.trips["trip-1"] = tripMeta{owner: "user-1", base: "IDR"}
	u := NewUsecase(repo, &mockConverter{err: errors.New("upstream down")})

	_, err := u.Create("user-1", "trip-1", CreateInput{
		Title: "x", Amount: 5, Currency: "USD", Category: CategoryFood,
	})
	if err == nil {
		t.Error("expected error from converter failure")
	}
}

func TestCreate_ValidationBeforeConvert(t *testing.T) {
	repo := newMockRepo()
	repo.trips["trip-1"] = tripMeta{owner: "user-1", base: "IDR"}
	conv := &mockConverter{rate: 1}
	u := NewUsecase(repo, conv)

	_, err := u.Create("user-1", "trip-1", CreateInput{
		Title: "", Amount: 5, Currency: "USD", Category: CategoryFood,
	})
	if err == nil {
		t.Error("expected error for empty title")
	}
}

// ---------- Ownership ----------

func TestUpdate_Forbidden(t *testing.T) {
	repo := newMockRepo()
	repo.trips["trip-1"] = tripMeta{owner: "user-other", base: "IDR"}
	repo.expenses["e1"] = &Expense{ID: "e1", TripID: "trip-1"}
	repo.expenseOf["e1"] = "trip-1"
	u := NewUsecase(repo, &mockConverter{rate: 1})

	_, err := u.Update("user-1", "e1", UpdateInput{
		Title: "x", Amount: 5, Currency: "USD", Category: CategoryFood,
	})
	if !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestDelete_Forbidden(t *testing.T) {
	repo := newMockRepo()
	repo.trips["trip-1"] = tripMeta{owner: "user-other", base: "IDR"}
	repo.expenses["e1"] = &Expense{ID: "e1", TripID: "trip-1"}
	repo.expenseOf["e1"] = "trip-1"
	u := NewUsecase(repo, &mockConverter{rate: 1})

	if err := u.Delete("user-1", "e1"); !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestDelete_Success(t *testing.T) {
	repo := newMockRepo()
	repo.trips["trip-1"] = tripMeta{owner: "user-1", base: "IDR"}
	repo.expenses["e1"] = &Expense{ID: "e1", TripID: "trip-1"}
	repo.expenseOf["e1"] = "trip-1"
	u := NewUsecase(repo, &mockConverter{rate: 1})

	if err := u.Delete("user-1", "e1"); err != nil {
		t.Errorf("Delete: %v", err)
	}
	if _, ok := repo.expenses["e1"]; ok {
		t.Error("expense not removed")
	}
}

// ---------- List / Summary ownership ----------

func TestList_Forbidden(t *testing.T) {
	repo := newMockRepo()
	repo.trips["trip-1"] = tripMeta{owner: "user-other", base: "IDR"}
	u := NewUsecase(repo, &mockConverter{rate: 1})

	if _, err := u.List("user-1", "trip-1"); !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestSummary_Forbidden(t *testing.T) {
	repo := newMockRepo()
	repo.trips["trip-1"] = tripMeta{owner: "user-other", base: "IDR"}
	u := NewUsecase(repo, &mockConverter{rate: 1})

	if _, err := u.Summary("user-1", "trip-1"); !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestSummary_Success(t *testing.T) {
	repo := newMockRepo()
	repo.trips["trip-1"] = tripMeta{owner: "user-1", base: "IDR"}
	repo.summaryResult = &Summary{
		TotalBase: 100000, BaseCurrency: "IDR",
		ByCategory: []CategoryTotal{{Category: CategoryFood, Total: 60000}},
	}
	u := NewUsecase(repo, &mockConverter{rate: 1})

	s, err := u.Summary("user-1", "trip-1")
	if err != nil {
		t.Fatalf("Summary: %v", err)
	}
	if s.TotalBase != 100000 || s.BaseCurrency != "IDR" {
		t.Errorf("unexpected summary: %+v", s)
	}
}
