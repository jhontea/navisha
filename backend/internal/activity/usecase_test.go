package activity

import (
	"context"
	"encoding/json"
	"errors"
	"reflect"
	"sort"
	"testing"

	"github.com/jhontea/navisha/backend/internal/apperr"
)

// ---------- Create ----------

func TestUsecase_Create_Success(t *testing.T) {
	repo := newMockRepo()
	repo.dayOwners["day-1"] = "user-1"
	// no existing activities → new activity gets order_index=0
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
	repo.listByDayResult = []Activity{{ID: "a"}, {ID: "b"}, {ID: "c"}} // 3 existing
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

func TestUsecase_Create_InsertsByStartTime(t *testing.T) {
	repo := newMockRepo()
	repo.dayOwners["day-1"] = "user-1"
	repo.listByDayResult = []Activity{
		{ID: "breakfast", StartTime: "08:00"},
		{ID: "meeting", StartTime: "14:00"},
		{ID: "dinner", StartTime: "19:00"},
	}
	u := NewUsecase(repo)

	got, err := u.Create(context.Background(), "user-1", "day-1", CreateInput{
		Type: TypeNote, Title: "Lunch", StartTime: "11:00",
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if got.OrderIndex != 1 {
		t.Errorf("order_index = %d, want 1 (between 08:00 and 14:00)", got.OrderIndex)
	}
	want := map[string]int{"breakfast": 0, "new-act-id": 1, "meeting": 2, "dinner": 3}
	gotOrder := map[string]int{}
	for _, u := range repo.orderUpdates {
		gotOrder[u.id] = u.order
	}
	for id, order := range want {
		if gotOrder[id] != order {
			t.Errorf("order of %s = %d, want %d", id, gotOrder[id], order)
		}
	}
}

func TestInsertPosition(t *testing.T) {
	day := []Activity{{StartTime: "08:00"}, {StartTime: ""}, {StartTime: "14:00"}}
	cases := []struct {
		start string
		want  int
	}{
		{"", 3},      // untimed → end
		{"07:00", 0}, // before everything
		{"11:00", 2}, // skips the untimed note, lands before 14:00
		{"14:00", 3}, // ties go after the existing one
		{"20:00", 3},
	}
	for _, c := range cases {
		if got := insertPosition(day, c.start); got != c.want {
			t.Errorf("insertPosition(%q) = %d, want %d", c.start, got, c.want)
		}
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

func TestUsecase_CreateMany_BatchesAndCommits(t *testing.T) {
	repo := newMockRepo()
	repo.dayOwners["day-1"] = "user-1"
	repo.dayOwners["day-2"] = "user-1"
	u := NewUsecase(repo)

	err := u.CreateMany(context.Background(), "user-1", []CreateManyInput{
		{DayID: "day-1", CreateInput: CreateInput{Type: TypeNote, Title: "One"}},
		{DayID: "day-1", CreateInput: CreateInput{Type: TypeNote, Title: "Two"}},
		{DayID: "day-2", CreateInput: CreateInput{Type: TypeNote, Title: "Three"}},
	})
	if err != nil {
		t.Fatalf("CreateMany: %v", err)
	}
	if repo.beginTxCalls != 1 || repo.commitCalls != 1 {
		t.Fatalf("tx begin/commit = %d/%d, want 1/1", repo.beginTxCalls, repo.commitCalls)
	}
	if len(repo.batchInserted) != 3 {
		t.Fatalf("inserted %d activities, want 3", len(repo.batchInserted))
	}
	if repo.batchInserted[0].OrderIndex != 0 || repo.batchInserted[1].OrderIndex != 1 || repo.batchInserted[2].OrderIndex != 0 {
		t.Fatalf("relative order indexes = %d,%d,%d, want 0,1,0",
			repo.batchInserted[0].OrderIndex, repo.batchInserted[1].OrderIndex, repo.batchInserted[2].OrderIndex)
	}
}

func TestUsecase_CreateMany_RejectsMixedOwnership(t *testing.T) {
	repo := newMockRepo()
	repo.dayOwners["day-1"] = "user-1"
	repo.dayOwners["day-2"] = "user-2"
	u := NewUsecase(repo)

	err := u.CreateMany(context.Background(), "user-1", []CreateManyInput{
		{DayID: "day-1", CreateInput: CreateInput{Type: TypeNote, Title: "One"}},
		{DayID: "day-2", CreateInput: CreateInput{Type: TypeNote, Title: "Two"}},
	})
	if !errors.Is(err, apperr.ErrForbidden) {
		t.Fatalf("err = %v, want forbidden", err)
	}
	if repo.commitCalls != 0 || len(repo.batchInserted) != 0 {
		t.Fatal("unauthorized batch was committed or inserted")
	}
}

// ---------- Update / Delete ownership ----------

func TestUsecase_Update_Forbidden(t *testing.T) {
	repo := newMockRepo()
	repo.activities["a1"] = &Activity{ID: "a1", DayID: "day-1", Type: TypeNote}
	repo.dayOwners["day-1"] = "user-other"
	u := NewUsecase(repo)

	_, err := u.Update(context.Background(), "user-1", "a1", UpdateInput{Title: "x"})
	if !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestUsecase_Delete_Forbidden(t *testing.T) {
	repo := newMockRepo()
	repo.activities["a1"] = &Activity{ID: "a1", DayID: "day-1", Type: TypeNote}
	repo.dayOwners["day-1"] = "user-other"
	u := NewUsecase(repo)

	if err := u.Delete(context.Background(), "user-1", "a1"); !errors.Is(err, apperr.ErrForbidden) {
		t.Errorf("err = %v, want ErrForbidden", err)
	}
}

func TestUsecase_Delete_Success(t *testing.T) {
	repo := newMockRepo()
	repo.activities["a1"] = &Activity{ID: "a1", DayID: "day-1", Type: TypeNote}
	repo.dayOwners["day-1"] = "user-1"
	u := NewUsecase(repo)

	if err := u.Delete(context.Background(), "user-1", "a1"); err != nil {
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
	if len(repo.orderUpdates) != 3 {
		t.Fatalf("got %d updates, want 3", len(repo.orderUpdates))
	}
	// Phase 3D: BatchUpdateOrderTx iterates a map, so order is non-deterministic.
	// Check that each ID has the correct index via a lookup.
	got := make(map[string]int, 3)
	for _, ou := range repo.orderUpdates {
		got[ou.id] = ou.order
	}
	want := map[string]int{"c": 0, "a": 1, "b": 2}
	for id, expectedIdx := range want {
		if got[id] != expectedIdx {
			t.Errorf("orderUpdates[%s] = %d, want %d", id, got[id], expectedIdx)
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
	repo.batchUpdateErr = errors.New("db failure")
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

// ---------- ListByTrip ----------

// A1.2: ownership must be enforced for the whole trip, not just the first
// day. The usecase hands both userID and tripID to the repository, whose
// query filters on trips.user_id.
func TestUsecase_ListByTrip_PassesOwnerToRepo(t *testing.T) {
	repo := newMockRepo()
	repo.listByDayIDsResult = map[string][]Activity{"d1": {{ID: "a1", DayID: "d1"}}}
	u := NewUsecase(repo)

	got, err := u.ListByTrip(context.Background(), "user-1", "trip-1")
	if err != nil {
		t.Fatalf("ListByTrip: %v", err)
	}
	if len(repo.listByTripCalls) != 1 || repo.listByTripCalls[0] != "user-1/trip-1" {
		t.Errorf("repo calls = %v, want [user-1/trip-1]", repo.listByTripCalls)
	}
	if len(got["d1"]) != 1 {
		t.Errorf("got %v, want one activity for d1", got)
	}
}

func TestUsecase_ListByTrip_RepoError(t *testing.T) {
	repo := newMockRepo()
	repo.listByDayIDsErr = errors.New("db down")
	u := NewUsecase(repo)

	if _, err := u.ListByTrip(context.Background(), "user-1", "trip-1"); err == nil {
		t.Fatal("want error")
	}
}

// ---------- CreateBatch ----------

// finalOrder applies the repo's recorded order updates to the day's rows and
// returns the IDs in order_index order.
func finalOrder(repo *mockRepo) []string {
	rows, _ := repo.ListByDayTx(context.Background(), nil, "")
	for _, u := range repo.orderUpdates {
		for i := range rows {
			if rows[i].ID == u.id {
				rows[i].OrderIndex = u.order
			}
		}
	}
	sort.SliceStable(rows, func(i, j int) bool { return rows[i].OrderIndex < rows[j].OrderIndex })
	ids := make([]string, len(rows))
	for i, r := range rows {
		ids[i] = r.ID
	}
	return ids
}

func batchNote(title, start string) CreateInput {
	return CreateInput{Type: TypeNote, Title: title, StartTime: start}
}

func TestUsecase_CreateBatch_OrderMatchesOneByOne(t *testing.T) {
	existing := []Activity{
		{ID: "breakfast", StartTime: "08:00", OrderIndex: 0},
		{ID: "untimed", OrderIndex: 1},
		{ID: "dinner", StartTime: "19:00", OrderIndex: 2},
	}
	tests := []struct {
		name     string
		existing []Activity
		in       []CreateInput
		want     []string
	}{
		{"empty day keeps input order", nil,
			[]CreateInput{batchNote("a", ""), batchNote("b", ""), batchNote("c", "")},
			[]string{"new-a", "new-b", "new-c"}},
		{"timed items slot between existing, input out of time order", existing,
			[]CreateInput{batchNote("late", "15:00"), batchNote("early", "09:00"), batchNote("lunch", "12:00")},
			nil},
		{"untimed items go to the end", existing,
			[]CreateInput{batchNote("x", ""), batchNote("y", "10:00")},
			nil},
	}
	// Expected = what repeated Create gives, one input at a time:
	// case 2: +15:00 -> [b u late d]; +09:00 -> before first later timed ("late") -> [b u early late d]; +12:00 -> [b u early lunch late d]
	// case 3: +untimed -> end; +10:00 -> before dinner -> [b u y d x]
	tests[1].want = []string{"breakfast", "untimed", "new-early", "new-lunch", "new-late", "dinner"}
	tests[2].want = []string{"breakfast", "untimed", "new-y", "dinner", "new-x"}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := newMockRepo()
			repo.dayOwners["day-1"] = "user-1"
			repo.listByDayResult = append([]Activity(nil), tc.existing...)
			if _, err := NewUsecase(repo).CreateBatch(context.Background(), "user-1", "day-1", tc.in); err != nil {
				t.Fatalf("CreateBatch: %v", err)
			}
			if got := finalOrder(repo); !reflect.DeepEqual(got, tc.want) {
				t.Errorf("order = %v, want %v", got, tc.want)
			}
			if len(repo.batchInserted) != len(tc.in) || repo.commitCalls != 1 {
				t.Errorf("inserted %d (want %d), commits %d (want 1)", len(repo.batchInserted), len(tc.in), repo.commitCalls)
			}
		})
	}
}

func TestUsecase_CreateBatch_InvalidItemWritesNothing(t *testing.T) {
	repo := newMockRepo()
	repo.dayOwners["day-1"] = "user-1"
	_, err := NewUsecase(repo).CreateBatch(context.Background(), "user-1", "day-1", []CreateInput{
		batchNote("ok", "09:00"),
		{Type: TypeNote, Title: ""},
	})
	if !errors.Is(err, ErrInvalidPayload) {
		t.Fatalf("err = %v, want ErrInvalidPayload", err)
	}
	if len(repo.batchInserted) != 0 || repo.beginTxCalls != 0 {
		t.Errorf("wrote %d rows / began %d tx, want none", len(repo.batchInserted), repo.beginTxCalls)
	}
}

func TestUsecase_CreateBatch_ForeignDayForbidden(t *testing.T) {
	repo := newMockRepo()
	repo.dayOwners["day-1"] = "someone-else"
	_, err := NewUsecase(repo).CreateBatch(context.Background(), "user-1", "day-1", []CreateInput{batchNote("a", "")})
	if !errors.Is(err, apperr.ErrForbidden) {
		t.Fatalf("err = %v, want ErrForbidden", err)
	}
	if len(repo.batchInserted) != 0 {
		t.Error("wrote rows to a foreign day")
	}
}
