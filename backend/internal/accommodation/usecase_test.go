package accommodation

import (
	"errors"
	"testing"
	"time"

	"github.com/ahmadhafizh/navisha/backend/internal/apperr"
)

func date(y, m, d int) time.Time {
	return time.Date(y, time.Month(m), d, 0, 0, 0, 0, time.UTC)
}

func TestValidate(t *testing.T) {
	in := date(2026, 7, 1)
	out := date(2026, 7, 7)

	tests := []struct {
		name    string
		in      CreateInput
		wantErr error
	}{
		{"valid", CreateInput{Name: "Hotel A", CheckIn: in, CheckOut: out}, nil},
		{"same day", CreateInput{Name: "x", CheckIn: in, CheckOut: in}, nil},
		{"empty name", CreateInput{CheckIn: in, CheckOut: out}, ErrInvalidName},
		{"zero check_in", CreateInput{Name: "x", CheckOut: out}, ErrInvalidDates},
		{"zero check_out", CreateInput{Name: "x", CheckIn: in}, ErrInvalidDates},
		{"check_out before check_in", CreateInput{Name: "x", CheckIn: out, CheckOut: in}, ErrInvalidDates},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := validate(tc.in)
			if tc.wantErr == nil {
				if err != nil {
					t.Errorf("unexpected err: %v", err)
				}
				return
			}
			if !errors.Is(err, tc.wantErr) {
				t.Errorf("err = %v, want %v", err, tc.wantErr)
			}
		})
	}
}

// ---------- Create ----------

func TestCreate_Success(t *testing.T) {
	repo := newMockRepo()
	repo.tripOwners["trip-1"] = "user-1"
	u := NewUsecase(repo)

	in := date(2026, 7, 1)
	out := date(2026, 7, 7)
	a, err := u.Create("user-1", "trip-1", CreateInput{
		Name: "Four Seasons", CheckIn: in, CheckOut: out,
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if a.TripID != "trip-1" || a.Name != "Four Seasons" {
		t.Errorf("unexpected: %+v", a)
	}
}

func TestCreate_Forbidden(t *testing.T) {
	repo := newMockRepo()
	repo.tripOwners["trip-1"] = "user-other"
	u := NewUsecase(repo)

	_, err := u.Create("user-1", "trip-1", CreateInput{
		Name: "x", CheckIn: date(2026, 7, 1), CheckOut: date(2026, 7, 2),
	})
	if !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestCreate_TripNotFound(t *testing.T) {
	repo := newMockRepo()
	u := NewUsecase(repo)

	_, err := u.Create("user-1", "missing", CreateInput{
		Name: "x", CheckIn: date(2026, 7, 1), CheckOut: date(2026, 7, 2),
	})
	if !errors.Is(err, ErrTripNotFound) {
		t.Errorf("err = %v, want ErrTripNotFound", err)
	}
}

func TestCreate_InvalidName(t *testing.T) {
	repo := newMockRepo()
	repo.tripOwners["trip-1"] = "user-1"
	u := NewUsecase(repo)

	_, err := u.Create("user-1", "trip-1", CreateInput{
		Name: "", CheckIn: date(2026, 7, 1), CheckOut: date(2026, 7, 2),
	})
	if !errors.Is(err, ErrInvalidName) {
		t.Errorf("err = %v, want ErrInvalidName", err)
	}
}

func TestCreate_InvalidDates(t *testing.T) {
	repo := newMockRepo()
	repo.tripOwners["trip-1"] = "user-1"
	u := NewUsecase(repo)

	_, err := u.Create("user-1", "trip-1", CreateInput{
		Name: "x", CheckIn: date(2026, 7, 7), CheckOut: date(2026, 7, 1),
	})
	if !errors.Is(err, ErrInvalidDates) {
		t.Errorf("err = %v, want ErrInvalidDates", err)
	}
}

// ---------- Update / Delete ownership ----------

func TestUpdate_Forbidden(t *testing.T) {
	repo := newMockRepo()
	repo.tripOwners["trip-1"] = "user-other"
	repo.items["a1"] = &Accommodation{ID: "a1", TripID: "trip-1", Name: "Hotel"}
	repo.itemOf["a1"] = "trip-1"
	u := NewUsecase(repo)

	_, err := u.Update("user-1", "a1", UpdateInput{
		Name: "x", CheckIn: date(2026, 7, 1), CheckOut: date(2026, 7, 2),
	})
	if !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestUpdate_Success(t *testing.T) {
	repo := newMockRepo()
	repo.tripOwners["trip-1"] = "user-1"
	repo.items["a1"] = &Accommodation{ID: "a1", TripID: "trip-1", Name: "Old"}
	repo.itemOf["a1"] = "trip-1"
	u := NewUsecase(repo)

	out, err := u.Update("user-1", "a1", UpdateInput{
		Name: "New name", CheckIn: date(2026, 7, 1), CheckOut: date(2026, 7, 2),
	})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if out.Name != "New name" {
		t.Errorf("name = %q, want New name", out.Name)
	}
}

func TestDelete_Forbidden(t *testing.T) {
	repo := newMockRepo()
	repo.tripOwners["trip-1"] = "user-other"
	repo.items["a1"] = &Accommodation{ID: "a1", TripID: "trip-1"}
	repo.itemOf["a1"] = "trip-1"
	u := NewUsecase(repo)

	if err := u.Delete("user-1", "a1"); !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestDelete_Success(t *testing.T) {
	repo := newMockRepo()
	repo.tripOwners["trip-1"] = "user-1"
	repo.items["a1"] = &Accommodation{ID: "a1", TripID: "trip-1"}
	repo.itemOf["a1"] = "trip-1"
	u := NewUsecase(repo)

	if err := u.Delete("user-1", "a1"); err != nil {
		t.Errorf("Delete: %v", err)
	}
	if _, ok := repo.items["a1"]; ok {
		t.Error("not removed")
	}
}

// ---------- List ownership ----------

func TestList_Forbidden(t *testing.T) {
	repo := newMockRepo()
	repo.tripOwners["trip-1"] = "user-other"
	u := NewUsecase(repo)

	if _, err := u.List("user-1", "trip-1"); !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestList_Success(t *testing.T) {
	repo := newMockRepo()
	repo.tripOwners["trip-1"] = "user-1"
	repo.listResult = []Accommodation{
		{ID: "a1", Name: "A"},
		{ID: "a2", Name: "B"},
	}
	u := NewUsecase(repo)

	out, err := u.List("user-1", "trip-1")
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(out) != 2 {
		t.Errorf("got %d items, want 2", len(out))
	}
}
