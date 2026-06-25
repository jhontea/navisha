package autogen

import (
	"errors"
	"strings"
	"testing"
	"time"
)

func mkInput(start, end string) GenerateInput {
	s, _ := time.Parse("2006-01-02", start)
	e, _ := time.Parse("2006-01-02", end)
	return GenerateInput{
		Destination:  "Tokyo, Japan",
		Description:  "suka anime dan kuliner",
		StartDate:    s,
		EndDate:      e,
		BaseCurrency: "IDR",
	}
}

func TestValidateInput_OK(t *testing.T) {
	if err := ValidateInput(mkInput("2026-07-01", "2026-07-05")); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestValidateInput_EmptyDestination(t *testing.T) {
	in := mkInput("2026-07-01", "2026-07-05")
	in.Destination = "   "
	if err := ValidateInput(in); !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestValidateInput_GarbageDestination(t *testing.T) {
	in := mkInput("2026-07-01", "2026-07-05")
	in.Destination = "123 !@# 456"
	if err := ValidateInput(in); !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput for garbage, got %v", err)
	}
}

func TestValidateInput_TooLongRange(t *testing.T) {
	in := mkInput("2026-07-01", "2026-07-15") // 15 days > 10
	if err := ValidateInput(in); !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput for >10 days, got %v", err)
	}
}

func TestValidateInput_ExactMaxRange(t *testing.T) {
	in := mkInput("2026-07-01", "2026-07-10") // exactly 10 days
	if err := ValidateInput(in); err != nil {
		t.Fatalf("expected 10 days to be allowed, got %v", err)
	}
}

func TestValidateInput_EndBeforeStart(t *testing.T) {
	in := mkInput("2026-07-05", "2026-07-01")
	if err := ValidateInput(in); !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestParseAndValidate_OKGuardFalse(t *testing.T) {
	in := mkInput("2026-07-01", "2026-07-03")
	raw := `{"ok": false, "reason": "input tidak jelas", "trip": null}`
	_, err := ParseAndValidate(raw, in)
	if !errors.Is(err, ErrInvalidPrompt) {
		t.Fatalf("expected ErrInvalidPrompt, got %v", err)
	}
}

func TestParseAndValidate_HappyPath(t *testing.T) {
	in := mkInput("2026-07-01", "2026-07-02")
	raw := `{
		"ok": true,
		"reason": "",
		"trip": {
			"title": "Liburan Tokyo",
			"destination": "Tokyo, Japan",
			"total_days": 2,
			"travel_style": "seimbang antara wisata, kuliner, dan relaksasi",
			"summary": "Liburan seru 2 hari di Tokyo",
			"base_currency": "IDR",
			"budget": 5000000,
			"tips": ["bawa payung", "beli JR Pass"],
			"days": [
				{"day_number": 1, "date": "2026-07-01", "theme": "Hari Pertama: Kedatangan & Eksplorasi", "activities": [
					{"type": "location", "title": "Shibuya", "start_time": "09:00", "end_time": "11:00", "location_name": "Shibuya Crossing", "address": "", "lat": 35.6, "lng": 139.7, "google_place_id": "", "category": "invalidKategori", "notes": "ramai"}
				]},
				{"day_number": 2, "date": "2026-07-02", "theme": "Hari Kedua: Kuliner", "activities": [
					{"type": "note", "title": "Tips", "start_time": "", "end_time": "", "location_name": "", "address": "", "lat": null, "lng": null, "google_place_id": "", "category": "", "notes": "bawa payung"}
				]}
			]
		}
	}`
	draft, err := ParseAndValidate(raw, in)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(draft.Days) != 2 {
		t.Fatalf("expected 2 days, got %d", len(draft.Days))
	}
	if draft.Days[0].Date != "2026-07-01" {
		t.Errorf("expected date 2026-07-01, got %s", draft.Days[0].Date)
	}
	if draft.Days[0].Activities[0].LocationName != "Shibuya Crossing" {
		t.Errorf("unexpected location name: %s", draft.Days[0].Activities[0].LocationName)
	}
	// AI-provided coords must be stripped to avoid wrong map pins.
	if draft.Days[0].Activities[0].Lat != nil || draft.Days[0].Activities[0].Lng != nil {
		t.Errorf("expected lat/lng to be nil, got lat=%v lng=%v",
			draft.Days[0].Activities[0].Lat, draft.Days[0].Activities[0].Lng)
	}
	// New fields should be populated
	if draft.Destination != "Tokyo, Japan" {
		t.Errorf("expected destination Tokyo, Japan, got %s", draft.Destination)
	}
	if draft.TotalDays != 2 {
		t.Errorf("expected total_days 2, got %d", draft.TotalDays)
	}
	if len(draft.Tips) != 2 {
		t.Errorf("expected 2 tips, got %d", len(draft.Tips))
	}
	if draft.Days[0].Theme != "Hari Pertama: Kedatangan & Eksplorasi" {
		t.Errorf("unexpected theme: %s", draft.Days[0].Theme)
	}
	if draft.Days[0].Activities[0].Category != "kuliner" {
		t.Errorf("expected category sanitized to kuliner, got %s", draft.Days[0].Activities[0].Category)
	}
}

func TestParseAndValidate_StripFence(t *testing.T) {
	in := mkInput("2026-07-01", "2026-07-01")
	raw := "```json\n" + `{"ok": true, "reason": "", "trip": {"title": "T", "description": "", "base_currency": "IDR", "budget": 0, "days": [{"day_number": 1, "date": "x", "activities": []}]}}` + "\n```"
	draft, err := ParseAndValidate(raw, in)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(draft.Days) != 1 {
		t.Fatalf("expected 1 day, got %d", len(draft.Days))
	}
}

func TestParseAndValidate_TrimsExcessDaysAndActivities(t *testing.T) {
	in := mkInput("2026-07-01", "2026-07-01") // 1 day expected
	var acts strings.Builder
	for i := 0; i < 10; i++ { // 10 activities, should trim to MaxActivitiesPerDay
		if i > 0 {
			acts.WriteString(",")
		}
		acts.WriteString(`{"type":"note","title":"a","start_time":"","end_time":"","location_name":"","lat":null,"lng":null,"notes":""}`)
	}
	raw := `{"ok":true,"reason":"","trip":{"title":"T","description":"","base_currency":"IDR","budget":0,"days":[
		{"day_number":1,"date":"x","activities":[` + acts.String() + `]},
		{"day_number":2,"date":"y","activities":[]}
	]}}`
	draft, err := ParseAndValidate(raw, in)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(draft.Days) != 1 {
		t.Fatalf("expected days trimmed to 1, got %d", len(draft.Days))
	}
	if len(draft.Days[0].Activities) != MaxActivitiesPerDay {
		t.Errorf("expected activities trimmed to %d, got %d", MaxActivitiesPerDay, len(draft.Days[0].Activities))
	}
}

func TestParseAndValidate_DropsUnsupportedActivityTypes(t *testing.T) {
	in := mkInput("2026-07-01", "2026-07-01")
	raw := `{"ok":true,"reason":"","trip":{"title":"T","description":"","base_currency":"IDR","budget":0,"days":[
		{"day_number":1,"date":"x","activities":[
			{"type":"todo","title":"x","start_time":"","end_time":"","location_name":"","lat":null,"lng":null,"notes":""},
			{"type":"location","title":"Valid","start_time":"","end_time":"","location_name":"","lat":null,"lng":null,"notes":""}
		]}
	]}}`
	draft, err := ParseAndValidate(raw, in)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(draft.Days[0].Activities) != 1 {
		t.Fatalf("expected 1 valid activity, got %d", len(draft.Days[0].Activities))
	}
	// location with empty location_name falls back to title
	if draft.Days[0].Activities[0].LocationName != "Valid" {
		t.Errorf("expected location_name fallback to title, got %s", draft.Days[0].Activities[0].LocationName)
	}
}

func TestParseAndValidate_InvalidJSON(t *testing.T) {
	in := mkInput("2026-07-01", "2026-07-01")
	if _, err := ParseAndValidate("not json", in); err == nil {
		t.Fatal("expected error for invalid json")
	}
}

func TestBuildPrompt_ContainsDates(t *testing.T) {
	in := mkInput("2026-07-01", "2026-07-03")
	system, user := BuildPrompt(in)
	if !strings.Contains(system, "travel planner") {
		t.Error("system prompt missing role")
	}
	if !strings.Contains(user, "2026-07-01") || !strings.Contains(user, "2026-07-03") {
		t.Error("user prompt missing dates")
	}
	if !strings.Contains(user, "Day 3") {
		t.Error("user prompt missing day enumeration")
	}
}

func TestJSONSchema_Shape(t *testing.T) {
	schema, ok := JSONSchema().(map[string]any)
	if !ok {
		t.Fatal("schema is not a map")
	}
	if schema["type"] != "object" {
		t.Errorf("expected root type object, got %v", schema["type"])
	}
	props, ok := schema["properties"].(map[string]any)
	if !ok {
		t.Fatal("missing properties")
	}
	for _, key := range []string{"ok", "reason", "trip"} {
		if _, exists := props[key]; !exists {
			t.Errorf("schema missing property %s", key)
		}
	}
}
