package trip

import (
	"encoding/base64"
	"errors"
	"testing"
	"time"
)

func TestCursorRoundtrip(t *testing.T) {
	want := time.Date(2026, 7, 15, 0, 0, 0, 0, time.UTC)
	wantID := "abc-123"

	enc := encodeCursor(want, wantID)
	if enc == "" {
		t.Fatal("encoded cursor is empty")
	}

	gotDate, gotID, has, err := decodeCursor(enc)
	if err != nil {
		t.Fatalf("decodeCursor: %v", err)
	}
	if !has {
		t.Fatal("hasCursor = false, want true")
	}
	if !gotDate.Equal(want) {
		t.Errorf("date = %v, want %v", gotDate, want)
	}
	if gotID != wantID {
		t.Errorf("id = %q, want %q", gotID, wantID)
	}
}

func TestCursorEmpty(t *testing.T) {
	_, _, has, err := decodeCursor("")
	if err != nil {
		t.Errorf("err = %v, want nil for empty cursor", err)
	}
	if has {
		t.Error("hasCursor = true for empty input")
	}
}

func TestCursorInvalid(t *testing.T) {
	// Build invalid inputs at runtime (avoids hand-crafted base64 strings).
	tests := []struct {
		name string
		in   string
	}{
		{"not base64", "!!!not-base64!!!"},
		{"no pipe separator", base64.URLEncoding.EncodeToString([]byte("not-a-date"))},
		{"unparseable date", base64.URLEncoding.EncodeToString([]byte("not-a-date|abc"))},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, _, _, err := decodeCursor(tc.in)
			if !errors.Is(err, ErrInvalidCursor) {
				t.Errorf("err = %v, want ErrInvalidCursor", err)
			}
		})
	}
}
