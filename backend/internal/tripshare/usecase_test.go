package tripshare

import (
	"context"
	"testing"
	"time"
)

type fakeRepository struct {
	created   *Link
	resolved  *PublicItinerary
	resolveID string
}

func (f *fakeRepository) Create(_ context.Context, tripID, userID string, expiresAt time.Time) (*Link, error) {
	f.created = &Link{ID: "share-id", TripID: tripID, CreatedBy: userID, ExpiresAt: expiresAt}
	return f.created, nil
}
func (f *fakeRepository) FindActive(context.Context, string, string) (*Link, error) {
	return f.created, nil
}
func (f *fakeRepository) Revoke(context.Context, string, string) error { return nil }
func (f *fakeRepository) Resolve(_ context.Context, id string) (*PublicItinerary, error) {
	f.resolveID = id
	return f.resolved, nil
}

func TestCreateAcceptsThirtyDays(t *testing.T) {
	repo := &fakeRepository{}
	u := NewUsecase(repo, "test-secret")
	now := time.Date(2026, 7, 22, 0, 0, 0, 0, time.UTC)
	u.now = func() time.Time { return now }
	result, err := u.Create(context.Background(), "user", "trip", 30)
	if err != nil {
		t.Fatal(err)
	}
	if got := result.ExpiresAt.Sub(now); got != 30*24*time.Hour {
		t.Fatalf("expiry = %v", got)
	}
	if result.Token == "" {
		t.Fatal("expected signed token")
	}
}

func TestCreateRejectsUnsupportedDuration(t *testing.T) {
	u := NewUsecase(&fakeRepository{}, "test-secret")
	if _, err := u.Create(context.Background(), "user", "trip", 31); err != ErrInvalidDuration {
		t.Fatalf("error = %v", err)
	}
}

func TestResolveRejectsTamperedToken(t *testing.T) {
	repo := &fakeRepository{resolved: &PublicItinerary{Title: "Tokyo"}}
	u := NewUsecase(repo, "test-secret")
	result, err := u.Create(context.Background(), "user", "trip", 7)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := u.Resolve(context.Background(), result.Token+"x"); err != ErrInvalidToken {
		t.Fatalf("error = %v", err)
	}
	if repo.resolveID != "" {
		t.Fatal("repository should not be called for invalid token")
	}
}

func TestResolveValidToken(t *testing.T) {
	repo := &fakeRepository{resolved: &PublicItinerary{Title: "Tokyo"}}
	u := NewUsecase(repo, "test-secret")
	result, err := u.Create(context.Background(), "user", "trip", 7)
	if err != nil {
		t.Fatal(err)
	}
	got, err := u.Resolve(context.Background(), result.Token)
	if err != nil {
		t.Fatal(err)
	}
	if got.Title != "Tokyo" || repo.resolveID != "share-id" {
		t.Fatalf("unexpected resolve result: %#v id=%s", got, repo.resolveID)
	}
}

func TestSanitizeLocationPayloadRemovesPrivateNotes(t *testing.T) {
	got := string(sanitizeLocationPayload([]byte(`{"location_name":"Shibuya","address":"Tokyo","notes":"private","google_place_id":"secret-ish"}`)))
	if got != `{"address":"Tokyo","location_name":"Shibuya"}` {
		t.Fatalf("sanitized payload = %s", got)
	}
}
