package activity

import (
	"encoding/json"
	"errors"
	"testing"
)

func TestValidatePayload(t *testing.T) {
	loc, _ := json.Marshal(LocationPayload{LocationName: "Tokyo", Lat: 35.6, Lng: 139.7})
	locWithURL, _ := json.Marshal(LocationPayload{LocationName: "Tokyo", ExternalURL: "https://example.com/tickets"})
	locWithUnsafeURL, _ := json.Marshal(LocationPayload{LocationName: "Tokyo", ExternalURL: "javascript:alert(1)"})
	locWithRelativeURL, _ := json.Marshal(LocationPayload{LocationName: "Tokyo", ExternalURL: "example.com/tickets"})
	locNoName, _ := json.Marshal(LocationPayload{Lat: 35.6, Lng: 139.7})
	note, _ := json.Marshal(NotePayload{Content: "hello"})
	todo, _ := json.Marshal(TodoPayload{Items: []TodoItem{{ID: "1", Text: "x"}}})

	tests := []struct {
		name    string
		typ     Type
		payload json.RawMessage
		wantErr error
	}{
		{"empty payload allowed", TypeNote, nil, nil},
		{"valid location", TypeLocation, loc, nil},
		{"valid location external URL", TypeLocation, locWithURL, nil},
		{"unsafe location external URL", TypeLocation, locWithUnsafeURL, ErrInvalidPayload},
		{"relative location external URL", TypeLocation, locWithRelativeURL, ErrInvalidPayload},
		{"location missing name", TypeLocation, locNoName, ErrInvalidPayload},
		{"location wrong shape", TypeLocation, json.RawMessage(`{"lat":"bad"}`), ErrInvalidPayload},
		{"valid note", TypeNote, note, nil},
		{"note wrong shape", TypeNote, json.RawMessage(`["a"]`), ErrInvalidPayload},
		{"valid todo", TypeTodo, todo, nil},
		{"todo wrong shape", TypeTodo, json.RawMessage(`{"items":"bad"}`), ErrInvalidPayload},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := validatePayload(tc.typ, tc.payload)
			if tc.wantErr == nil {
				if err != nil {
					t.Errorf("got err %v, want nil", err)
				}
				return
			}
			if !errors.Is(err, tc.wantErr) {
				t.Errorf("err = %v, want %v", err, tc.wantErr)
			}
		})
	}
}

func TestTypeValid(t *testing.T) {
	tests := []struct {
		in   Type
		want bool
	}{
		{TypeLocation, true},
		{TypeNote, true},
		{TypeTodo, true},
		{"", false},
		{"bogus", false},
	}
	for _, tc := range tests {
		if got := tc.in.Valid(); got != tc.want {
			t.Errorf("Type(%q).Valid() = %v, want %v", tc.in, got, tc.want)
		}
	}
}
