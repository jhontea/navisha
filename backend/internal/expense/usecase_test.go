package expense

import (
	"context"
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

	e, err := u.Create(context.Background(), "user-1", "trip-1", CreateInput{
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

	_, err := u.Create(context.Background(), "user-1", "trip-1", CreateInput{
		Title: "x", Amount: 5, Currency: "USD", Category: CategoryFood,
	})
	if !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestCreate_TripNotFound(t *testing.T) {
	repo := newMockRepo()
	u := NewUsecase(repo, &mockConverter{rate: 1})

	_, err := u.Create(context.Background(), "user-1", "missing", CreateInput{
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

	_, err := u.Create(context.Background(), "user-1", "trip-1", CreateInput{
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

	_, err := u.Create(context.Background(), "user-1", "trip-1", CreateInput{
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

	_, err := u.Update(context.Background(), "user-1", "e1", UpdateInput{
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

	if err := u.Delete(context.Background(), "user-1", "e1"); !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestDelete_Success(t *testing.T) {
	repo := newMockRepo()
	repo.trips["trip-1"] = tripMeta{owner: "user-1", base: "IDR"}
	repo.expenses["e1"] = &Expense{ID: "e1", TripID: "trip-1"}
	repo.expenseOf["e1"] = "trip-1"
	u := NewUsecase(repo, &mockConverter{rate: 1})

	if err := u.Delete(context.Background(), "user-1", "e1"); err != nil {
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

	if _, err := u.List(context.Background(), "user-1", "trip-1"); !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestSummary_Forbidden(t *testing.T) {
	repo := newMockRepo()
	repo.trips["trip-1"] = tripMeta{owner: "user-other", base: "IDR"}
	u := NewUsecase(repo, &mockConverter{rate: 1})

	if _, err := u.Summary(context.Background(), "user-1", "trip-1"); !errors.Is(err, apperr.ErrForbidden) {
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

	s, err := u.Summary(context.Background(), "user-1", "trip-1")
	if err != nil {
		t.Fatalf("Summary: %v", err)
	}
	if s.TotalBase != 100000 || s.BaseCurrency != "IDR" {
		t.Errorf("unexpected summary: %+v", s)
	}
}

// rateConverter converts with a per-pair rate table ("FROM→TO" → rate).
type rateConverter struct {
	rates map[string]float64
}

func (c *rateConverter) Convert(_ context.Context, from, to string, amount float64) (float64, float64, error) {
	if from == to {
		return amount, 1, nil
	}
	r, ok := c.rates[from+"→"+to]
	if !ok {
		return 0, 0, errors.New("no rate " + from + "→" + to)
	}
	return amount * r, r, nil
}

// Bug A1.1: after the trip base changes IDR→USD, every expense must be
// reconverted from its original amount/currency into USD.
func TestUsecase_RebaseTx_IDRToUSD(t *testing.T) {
	repo := newMockRepo()
	repo.trips["t1"] = tripMeta{owner: "user-1", base: "IDR"}
	repo.expenses["e1"] = &Expense{ID: "e1", Amount: 160_000, Currency: "IDR", ConvertedAmount: 160_000, BaseCurrency: "IDR"}
	repo.expenses["e2"] = &Expense{ID: "e2", Amount: 1_000, Currency: "JPY", ConvertedAmount: 107_000, BaseCurrency: "IDR"}
	repo.expenses["e3"] = &Expense{ID: "e3", Amount: 5, Currency: "USD", ConvertedAmount: 80_000, BaseCurrency: "IDR"}
	repo.expenses["other"] = &Expense{ID: "other", Amount: 1, Currency: "IDR", ConvertedAmount: 1, BaseCurrency: "IDR"}
	for _, id := range []string{"e1", "e2", "e3"} {
		repo.expenseOf[id] = "t1"
	}
	repo.expenseOf["other"] = "t2"

	u := NewUsecase(repo, &rateConverter{rates: map[string]float64{
		"IDR→USD": 1.0 / 16_000,
		"JPY→USD": 0.0067,
	}})

	if err := u.RebaseTx(context.Background(), nil, "t1", "USD"); err != nil {
		t.Fatalf("RebaseTx: %v", err)
	}

	want := map[string]float64{"e1": 10, "e2": 6.7, "e3": 5}
	for id, w := range want {
		e := repo.expenses[id]
		if e.BaseCurrency != "USD" {
			t.Errorf("%s base = %q, want USD", id, e.BaseCurrency)
		}
		if diff := e.ConvertedAmount - w; diff > 1e-9 || diff < -1e-9 {
			t.Errorf("%s converted = %v, want %v", id, e.ConvertedAmount, w)
		}
	}
	if other := repo.expenses["other"]; other.BaseCurrency != "IDR" {
		t.Errorf("expense of another trip was rebased")
	}
}

func TestUsecase_RebaseTx_ConvertErrorStops(t *testing.T) {
	repo := newMockRepo()
	repo.expenses["e1"] = &Expense{ID: "e1", Amount: 10, Currency: "KRW"}
	repo.expenseOf["e1"] = "t1"

	u := NewUsecase(repo, &rateConverter{rates: map[string]float64{}})
	if err := u.RebaseTx(context.Background(), nil, "t1", "USD"); err == nil {
		t.Fatal("RebaseTx: want error when a rate is missing")
	}
}
