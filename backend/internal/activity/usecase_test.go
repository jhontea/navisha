package activity

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/ahmadhafizh/navisha/backend/internal/apperr"
)

// ---------- Create ----------

func TestUsecase_Create_Success(t *testing.T) {
	repo := newMockRepo()
	repo.dayOwners["day-1"] = "user-1"
	repo.dayIDs["day-1"] = []string{} // empty → new activity gets order_index=0
	u := NewUsecase(repo)

	payload, _ := json.Marshal(NotePayload{Content: "test"})
	got, err := u.Create(context.Background(), "user-1", "day-1", CreateInput{
		Type:    TypeNote,
		Title:   "Note",
		Payload: payload,
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if got.OrderIndex != 0 {
		t.Errorf("order_index = %d, want 0 (first activity)", got.OrderIndex)
	}
	if got.DayID != "day-1" {
		t.Errorf("day_id = %q, want day-1", got.DayID)
	}
}

func TestUsecase_Create_AppendsToEnd(t *testing.T) {
	repo := newMockRepo()
	repo.dayOwners["day-1"] = "user-1"
	repo.dayIDs["day-1"] = []string{"a", "b", "c"} // 3 existing
	u := NewUsecase(repo)

	got, err := u.Create(context.Background(), "user-1", "day-1", CreateInput{
		Type:  TypeNote,
		Title: "Note",
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if got.OrderIndex != 3 {
		t.Errorf("order_index = %d, want 3 (after 3 existing)", got.OrderIndex)
	}
}

func TestUsecase_Create_Forbidden(t *testing.T) {
	repo := newMockRepo()
	repo.dayOwners["day-1"] = "user-other"
	u := NewUsecase(repo)

	_, err := u.Create(context.Background(), "user-1", "day-1", CreateInput{
		Type: TypeNote, Title: "x",
	})
	if !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestUsecase_Create_DayNotFound(t *testing.T) {
	repo := newMockRepo()
	u := NewUsecase(repo)

	_, err := u.Create(context.Background(), "user-1", "missing-day", CreateInput{
		Type: TypeNote, Title: "x",
	})
	if !errors.Is(err, ErrDayNotFound) {
		t.Errorf("err = %v, want ErrDayNotFound", err)
	}
}

func TestUsecase_Create_InvalidType(t *testing.T) {
	repo := newMockRepo()
	repo.dayOwners["day-1"] = "user-1"
	u := NewUsecase(repo)

	_, err := u.Create(context.Background(), "user-1", "day-1", CreateInput{
		Type: "bogus", Title: "x",
	})
	if !errors.Is(err, ErrInvalidType) {
		t.Errorf("err = %v, want ErrInvalidType", err)
	}
}

func TestUsecase_Create_EmptyTitle(t *testing.T) {
	repo := newMockRepo()
	repo.dayOwners["day-1"] = "user-1"
	u := NewUsecase(repo)

	_, err := u.Create(context.Background(), "user-1", "day-1", CreateInput{
		Type: TypeNote, Title: "",
	})
	if !errors.Is(err, ErrInvalidPayload) {
		t.Errorf("err = %v, want ErrInvalidPayload", err)
	}
}

// ---------- Update / Delete ownership ----------

func TestUsecase_Update_Forbidden(t *testing.T) {
	repo := newMockRepo()
	repo.activities["a1"] = &Activity{ID: "a1", DayID: "day-1", Type: TypeNote}
	repo.dayOwners["day-1"] = "user-other"
	u := NewUsecase(repo)

	_, err := u.Update("user-1", "a1", UpdateInput{Title: "x"})
	if !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestUsecase_Delete_Forbidden(t *testing.T) {
	repo := newMockRepo()
	repo.activities["a1"] = &Activity{ID: "a1", DayID: "day-1", Type: TypeNote}
	repo.dayOwners["day-1"] = "user-other"
	u := NewUsecase(repo)

	if err := u.Delete("user-1", "a1"); !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestUsecase_Delete_Success(t *testing.T) {
	repo := newMockRepo()
	repo.activities["a1"] = &Activity{ID: "a1", DayID: "day-1", Type: TypeNote}
	repo.dayOwners["day-1"] = "user-1"
	u := NewUsecase(repo)

	if err := u.Delete("user-1", "a1"); err != nil {
		t.Errorf("Delete: %v", err)
	}
	if _, ok := repo.activities["a1"]; ok {
		t.Error("activity not removed from repo")
	}
}

// ---------- Reorder ----------

func TestUsecase_Reorder_Success(t *testing.T) {
	repo := newMockRepo()
	repo.dayOwners["day-1"] = "user-1"
	repo.dayIDs["day-1"] = []string{"a", "b", "c"}
	u := NewUsecase(repo)

	if err := u.Reorder(context.Background(), "user-1", "day-1", []string{"c", "a", "b"}); err != nil {
		t.Fatalf("Reorder: %v", err)
	}
	if repo.beginTxCalls != 1 || repo.commitCalls != 1 {
		t.Errorf("tx: begin=%d commit=%d, want 1/1", repo.beginTxCalls, repo.commitCalls)
	}
	want := []orderUpdate{{"c", 0}, {"a", 1}, {"b", 2}}
	if len(repo.orderUpdates) != 3 {
		t.Fatalf("got %d updates, want 3", len(repo.orderUpdates))
	}
	for i, ou := range repo.orderUpdates {
		if ou != want[i] {
			t.Errorf("update[%d] = %+v, want %+v", i, ou, want[i])
		}
	}
}

func TestUsecase_Reorder_Forbidden(t *testing.T) {
	repo := newMockRepo()
	repo.dayOwners["day-1"] = "user-other"
	u := NewUsecase(repo)

	err := u.Reorder(context.Background(), "user-1", "day-1", []string{"a"})
	if !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestUsecase_Reorder_MismatchExtraID(t *testing.T) {
	repo := newMockRepo()
	repo.dayOwners["day-1"] = "user-1"
	repo.dayIDs["day-1"] = []string{"a", "b"}
	u := NewUsecase(repo)

	err := u.Reorder(context.Background(), "user-1", "day-1", []string{"a", "b", "c"})
	if !errors.Is(err, ErrReorderMismatch) {
		t.Errorf("err = %v, want ErrReorderMismatch", err)
	}
	if repo.beginTxCalls != 0 {
		t.Errorf("tx opened before mismatch detected (begin=%d)", repo.beginTxCalls)
	}
}

func TestUsecase_Reorder_MismatchMissingID(t *testing.T) {
	repo := newMockRepo()
	repo.dayOwners["day-1"] = "user-1"
	repo.dayIDs["day-1"] = []string{"a", "b", "c"}
	u := NewUsecase(repo)

	err := u.Reorder(context.Background(), "user-1", "day-1", []string{"a", "b"})
	if !errors.Is(err, ErrReorderMismatch) {
		t.Errorf("err = %v, want ErrReorderMismatch", err)
	}
}

func TestUsecase_Reorder_RollbackOnError(t *testing.T) {
	repo := newMockRepo()
	repo.dayOwners["day-1"] = "user-1"
	repo.dayIDs["day-1"] = []string{"a", "b"}
	repo.updateOrderErr = errors.New("db failure")
	u := NewUsecase(repo)

	err := u.Reorder(context.Background(), "user-1", "day-1", []string{"a", "b"})
	if err == nil {
		t.Fatal("expected error")
	}
	if repo.commitCalls != 0 {
		t.Errorf("commit called on failure")
	}
	if repo.rollbackCalls == 0 {
		t.Error("rollback not called")
	}
}

// ---------- sameSet helper ----------

func TestSameSet(t *testing.T) {
	tests := []struct {
		name string
		a    []string
		b    []string
		want bool
	}{
		{"equal", []string{"a", "b"}, []string{"b", "a"}, true},
		{"length mismatch", []string{"a"}, []string{"a", "b"}, false},
		{"different elements", []string{"a", "b"}, []string{"a", "c"}, false},
		{"duplicate handling", []string{"a", "a"}, []string{"a", "b"}, false},
		{"empty both", nil, nil, true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := sameSet(tc.a, tc.b); got != tc.want {
				t.Errorf("sameSet = %v, want %v", got, tc.want)
			}
		})
	}
}
