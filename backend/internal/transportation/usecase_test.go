package transportation

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/ahmadhafizh/navisha/backend/internal/apperr"
)

func TestTypeValid(t *testing.T) {
	tests := []struct {
		in   Type
		want bool
	}{
		{TypeFlight, true},
		{TypeBus, true},
		{TypeTrain, true},
		{TypeFerry, true},
		{TypeShip, true},
		{TypeCar, true},
		{TypeOther, true},
		{"", false},
		{"bogus", false},
	}
	for _, tc := range tests {
		if got := tc.in.Valid(); got != tc.want {
			t.Errorf("Type(%q).Valid() = %v, want %v", tc.in, got, tc.want)
		}
	}
}

func ptrTime(t time.Time) *time.Time { return &t }

func TestValidate(t *testing.T) {
	dep := time.Date(2026, 7, 1, 8, 0, 0, 0, time.UTC)
	arr := time.Date(2026, 7, 1, 10, 0, 0, 0, time.UTC)
	tests := []struct {
		name    string
		in      CreateInput
		wantErr bool
	}{
		{"flight no times", CreateInput{Type: TypeFlight}, false},
		{"flight dep before arr", CreateInput{Type: TypeFlight, DepartureDatetime: &dep, ArrivalDatetime: &arr}, false},
		{"flight arr before dep", CreateInput{Type: TypeFlight, DepartureDatetime: &arr, ArrivalDatetime: &dep}, true},
		{"only departure", CreateInput{Type: TypeFlight, DepartureDatetime: &dep}, false},
		{"only arrival", CreateInput{Type: TypeFlight, ArrivalDatetime: &arr}, false},
		{"bogus type", CreateInput{Type: "bogus"}, true},
		{"empty type", CreateInput{Type: ""}, true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := validate(tc.in)
			if tc.wantErr && err == nil {
				t.Error("expected error")
			}
			if !tc.wantErr && err != nil {
				t.Errorf("unexpected error: %v", err)
			}
		})
	}
}

// ---------- Create ----------

func TestCreate_Success(t *testing.T) {
	repo := newMockRepo()
	repo.tripOwners["trip-1"] = "user-1"
	u := NewUsecase(repo, &mockExpenseCreator{})

	out, err := u.Create(context.Background(), "user-1", "trip-1", CreateInput{
		Type: TypeFlight, Label: "GA420", FromLocation: "CGK", ToLocation: "DPS",
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if out.TripID != "trip-1" || out.Type != TypeFlight {
		t.Errorf("unexpected out: %+v", out)
	}
}

func TestCreate_Forbidden(t *testing.T) {
	repo := newMockRepo()
	repo.tripOwners["trip-1"] = "user-other"
	u := NewUsecase(repo, &mockExpenseCreator{})

	_, err := u.Create(context.Background(), "user-1", "trip-1", CreateInput{Type: TypeFlight})
	if !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestCreate_TripNotFound(t *testing.T) {
	repo := newMockRepo()
	u := NewUsecase(repo, &mockExpenseCreator{})

	_, err := u.Create(context.Background(), "user-1", "missing", CreateInput{Type: TypeFlight})
	if !errors.Is(err, ErrTripNotFound) {
		t.Errorf("err = %v, want ErrTripNotFound", err)
	}
}

func TestCreate_InvalidType(t *testing.T) {
	repo := newMockRepo()
	repo.tripOwners["trip-1"] = "user-1"
	u := NewUsecase(repo, &mockExpenseCreator{})

	_, err := u.Create(context.Background(), "user-1", "trip-1", CreateInput{Type: "bogus"})
	if !errors.Is(err, ErrInvalidType) {
		t.Errorf("err = %v, want ErrInvalidType", err)
	}
}

// ---------- Update / Delete ownership ----------

func TestUpdate_Forbidden(t *testing.T) {
	repo := newMockRepo()
	repo.tripOwners["trip-1"] = "user-other"
	repo.items["t1"] = &Transportation{ID: "t1", TripID: "trip-1", Type: TypeFlight}
	repo.itemOf["t1"] = "trip-1"
	u := NewUsecase(repo, &mockExpenseCreator{})

	_, err := u.Update("user-1", "t1", UpdateInput{Type: TypeBus})
	if !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestUpdate_Success(t *testing.T) {
	repo := newMockRepo()
	repo.tripOwners["trip-1"] = "user-1"
	repo.items["t1"] = &Transportation{ID: "t1", TripID: "trip-1", Type: TypeFlight}
	repo.itemOf["t1"] = "trip-1"
	u := NewUsecase(repo, &mockExpenseCreator{})

	out, err := u.Update("user-1", "t1", UpdateInput{Type: TypeBus, Label: "K10"})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if out.Type != TypeBus || out.Label != "K10" {
		t.Errorf("unexpected out: %+v", out)
	}
}

func TestDelete_Forbidden(t *testing.T) {
	repo := newMockRepo()
	repo.tripOwners["trip-1"] = "user-other"
	repo.items["t1"] = &Transportation{ID: "t1", TripID: "trip-1"}
	repo.itemOf["t1"] = "trip-1"
	u := NewUsecase(repo, &mockExpenseCreator{})

	if err := u.Delete("user-1", "t1"); !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestDelete_Success(t *testing.T) {
	repo := newMockRepo()
	repo.tripOwners["trip-1"] = "user-1"
	repo.items["t1"] = &Transportation{ID: "t1", TripID: "trip-1"}
	repo.itemOf["t1"] = "trip-1"
	u := NewUsecase(repo, &mockExpenseCreator{})

	if err := u.Delete("user-1", "t1"); err != nil {
		t.Errorf("Delete: %v", err)
	}
	if _, ok := repo.items["t1"]; ok {
		t.Error("not removed")
	}
}

// ---------- List ownership ----------

func TestList_Forbidden(t *testing.T) {
	repo := newMockRepo()
	repo.tripOwners["trip-1"] = "user-other"
	u := NewUsecase(repo, &mockExpenseCreator{})

	if _, err := u.List("user-1", "trip-1"); !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestList_Success(t *testing.T) {
	repo := newMockRepo()
	repo.tripOwners["trip-1"] = "user-1"
	repo.listResult = []Transportation{
		{ID: "t1", Type: TypeFlight},
		{ID: "t2", Type: TypeBus},
	}
	u := NewUsecase(repo, &mockExpenseCreator{})

	out, err := u.List("user-1", "trip-1")
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(out) != 2 {
		t.Errorf("got %d items, want 2", len(out))
	}
}
