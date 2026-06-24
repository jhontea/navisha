package calendarexport

import (
	"testing"
	"time"
)

func mustDate(t *testing.T, s string) time.Time {
	t.Helper()
	d, err := time.Parse("2006-01-02", s)
	if err != nil {
		t.Fatalf("parse date %q: %v", s, err)
	}
	return d
}

func TestBuildEvent_TimedEvent(t *testing.T) {
	ev := buildEvent(CalendarItem{
		Title:        "Visit Senso-ji",
		LocationName: "Senso-ji Temple",
		Date:         mustDate(t, "2026-07-01"),
		StartTime:    "09:30",
		EndTime:      "11:00",
	})

	if ev.Summary != "Visit Senso-ji" {
		t.Errorf("Summary = %q", ev.Summary)
	}
	if ev.Location != "Senso-ji Temple" {
		t.Errorf("Location = %q", ev.Location)
	}
	// Naive wall-clock, no UTC conversion, no offset.
	if ev.Start.DateTime != "2026-07-01T09:30:00" {
		t.Errorf("Start.DateTime = %q, want naive 09:30", ev.Start.DateTime)
	}
	if ev.End.DateTime != "2026-07-01T11:00:00" {
		t.Errorf("End.DateTime = %q", ev.End.DateTime)
	}
	if ev.Start.TimeZone != defaultTimeZone {
		t.Errorf("Start.TimeZone = %q, want %q", ev.Start.TimeZone, defaultTimeZone)
	}
	if ev.Start.Date != "" {
		t.Errorf("timed event should not set Start.Date, got %q", ev.Start.Date)
	}
}

func TestBuildEvent_StartOnlyDefaultsOneHour(t *testing.T) {
	ev := buildEvent(CalendarItem{
		Title:     "Lunch",
		Date:      mustDate(t, "2026-07-01"),
		StartTime: "12:00",
	})
	if ev.Start.DateTime != "2026-07-01T12:00:00" {
		t.Errorf("Start.DateTime = %q", ev.Start.DateTime)
	}
	if ev.End.DateTime != "2026-07-01T13:00:00" {
		t.Errorf("End.DateTime = %q, want +1h", ev.End.DateTime)
	}
}

func TestBuildEvent_AllDayWhenNoTime(t *testing.T) {
	ev := buildEvent(CalendarItem{
		Title:        "Free day",
		LocationName: "Kyoto",
		Date:         mustDate(t, "2026-07-02"),
	})
	if ev.Start.Date != "2026-07-02" {
		t.Errorf("Start.Date = %q", ev.Start.Date)
	}
	// Google's end date is exclusive → next day.
	if ev.End.Date != "2026-07-03" {
		t.Errorf("End.Date = %q, want exclusive next day", ev.End.Date)
	}
	if ev.Start.DateTime != "" {
		t.Errorf("all-day event should not set DateTime, got %q", ev.Start.DateTime)
	}
}

func TestLocationString_PrefersAddress(t *testing.T) {
	got := locationString(CalendarItem{LocationName: "Tower", Address: "1 Main St"})
	if got != "1 Main St" {
		t.Errorf("locationString = %q, want address", got)
	}
	got = locationString(CalendarItem{LocationName: "Tower"})
	if got != "Tower" {
		t.Errorf("locationString = %q, want location name fallback", got)
	}
}

func TestParseDayTime(t *testing.T) {
	date := mustDate(t, "2026-07-01")
	if _, ok := parseDayTime(date, ""); ok {
		t.Error("empty time should return ok=false")
	}
	if _, ok := parseDayTime(date, "bad"); ok {
		t.Error("unparseable time should return ok=false")
	}
	got, ok := parseDayTime(date, "08:15")
	if !ok {
		t.Fatal("valid time should return ok=true")
	}
	if got != "2026-07-01T08:15:00" {
		t.Errorf("parseDayTime = %q, want naive 2026-07-01T08:15:00", got)
	}
}
