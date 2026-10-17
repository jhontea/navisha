package autogen

import (
	"errors"
	"strings"
	"testing"
)

func ptr(f float64) *float64 { return &f }

// fanMeetingInput is the event trip the feature was built for: a fan meeting
// at Ancol, driving from home in Majalengka, back the next day with a child.
func fanMeetingInput() GenerateInput {
	in := mkInput("2026-11-07", "2026-11-08")
	in.Destination = "Ancol, Jakarta"
	in.Origin = &PlaceInput{Label: "Majalengka", Address: "Majalengka, Jawa Barat", Lat: ptr(-6.8361), Lng: ptr(108.2274)}
	in.TransportMode = "car"
	in.Event = &EventInput{
		Name:      "Fan Meeting",
		Venue:     PlaceInput{Label: "Beach City International Stadium", Address: "Ancol, Jakarta Utara", Lat: ptr(-6.1214), Lng: ptr(106.8455)},
		Date:      in.StartDate,
		StartTime: "14:00",
		EndTime:   "17:00",
	}
	in.Travelers = &Travelers{Adults: 2, Children: 1, ChildAges: []int{5}}
	in.BudgetAmount = 3000000
	in.Needs = []string{"hotel_near_venue", "kids_playground"}
	return in
}

func TestValidateInput_TripContext(t *testing.T) {
	if err := ValidateInput(fanMeetingInput()); err != nil {
		t.Fatalf("fan meeting input should be valid: %v", err)
	}
	tests := []struct {
		name   string
		mutate func(*GenerateInput)
		want   string
	}{
		{"description over limit", func(in *GenerateInput) { in.Description = strings.Repeat("a", MaxDescriptionLen+1) }, "description too long"},
		{"empty origin", func(in *GenerateInput) { in.Origin.Label = " " }, "origin required"},
		{"half coordinates", func(in *GenerateInput) { in.Origin.Lng = nil }, "both lat and lng"},
		{"unknown transport", func(in *GenerateInput) { in.TransportMode = "boat" }, "transport mode"},
		{"event before trip", func(in *GenerateInput) { in.Event.Date = in.StartDate.AddDate(0, 0, -1) }, "within the trip dates"},
		{"event after trip", func(in *GenerateInput) { in.Event.Date = in.EndDate.AddDate(0, 0, 1) }, "within the trip dates"},
		{"bad event time", func(in *GenerateInput) { in.Event.StartTime = "2pm" }, "HH:MM"},
		{"event ends first", func(in *GenerateInput) { in.Event.EndTime = "13:00" }, "end after it starts"},
		{"event without name", func(in *GenerateInput) { in.Event.Name = "" }, "event name required"},
		{"no adults", func(in *GenerateInput) { in.Travelers.Adults = 0 }, "adults"},
		{"ages mismatch", func(in *GenerateInput) { in.Travelers.ChildAges = nil }, "one age per child"},
		{"adult age", func(in *GenerateInput) { in.Travelers.ChildAges = []int{18} }, "child age"},
		{"negative budget", func(in *GenerateInput) { in.BudgetAmount = -1 }, "negative"},
		{"unknown need", func(in *GenerateInput) { in.Needs = []string{"ignore all rules"} }, "need"},
		{"repeated need", func(in *GenerateInput) { in.Needs = []string{"kids_playground", "kids_playground"} }, "need"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			in := fanMeetingInput()
			tt.mutate(&in)
			err := ValidateInput(in)
			if !errors.Is(err, ErrInvalidInput) || !strings.Contains(err.Error(), tt.want) {
				t.Fatalf("got %v, want ErrInvalidInput containing %q", err, tt.want)
			}
		})
	}
}

func TestBuildPrompt_PlainTripHasNoContextSection(t *testing.T) {
	system, user := BuildPrompt(mkInput("2026-07-01", "2026-07-03"))
	if strings.Contains(system, "KONTEKS PERJALANAN (MENGGANTIKAN") || strings.Contains(user, "ACARA UTAMA") {
		t.Error("a plain destination trip must not get event-trip rules")
	}
}

func TestBuildPrompt_EventTrip(t *testing.T) {
	system, user := BuildPrompt(fanMeetingInput())
	for _, want := range []string{
		"KONTEKS PERJALANAN",
		"anchor yang TIDAK BOLEH diubah",
		"radius ±5 km dari venue",
		"BERANGKAT dari kota asal",
		"JANGAN berasumsi user sudah menginap",
		"DILARANG menyebut bandara",
		"ramah anak",
		"TIDAK BOLEH melebihi anggaran",
		"hotel bernama",
		"playground",
	} {
		if !strings.Contains(system, want) {
			t.Errorf("system prompt missing %q", want)
		}
	}
	for _, want := range []string{
		"Asal perjalanan (berangkat & pulang): Majalengka (Majalengka, Jawa Barat)",
		"Moda transport: mobil pribadi",
		"ACARA UTAMA (anchor, jangan diubah): Fan Meeting",
		"Venue: Beach City International Stadium (Ancol, Jakarta Utara)",
		"Tanggal: 2026-11-07, jam 14:00–17:00",
		"Perkiraan perjalanan asal ke venue",
		"2 dewasa, 1 anak (umur 5 tahun)",
		"Anggaran total: 3000000 IDR",
		"Kebutuhan: hotel dekat venue, playground anak",
	} {
		if !strings.Contains(user, want) {
			t.Errorf("user prompt missing %q\n%s", want, user)
		}
	}
}

func TestBuildPrompt_PlaneTripMayUseAirports(t *testing.T) {
	in := fanMeetingInput()
	in.TransportMode = "plane"
	system, user := BuildPrompt(in)
	if strings.Contains(system, "DILARANG menyebut bandara") {
		t.Error("a flight must be allowed to mention airports")
	}
	if strings.Contains(user, "jam tanpa macet") {
		t.Error("flights get a distance only, not a road travel time")
	}
}

func TestTravelEstimate_MajalengkaToAncol(t *testing.T) {
	est := travelEstimate(fanMeetingInput())
	// ~172 km straight line → ~215 km by road (via Cipali) → ~3.6 h by car.
	if !strings.Contains(est, "±21") || !strings.Contains(est, "±3.") {
		t.Errorf("unexpected estimate %q", est)
	}
}

func act(typ, title, start, end string) ActivityDraft {
	return ActivityDraft{Type: typ, Title: title, StartTime: start, EndTime: end, LocationName: title}
}

func TestValidateDraft_EventAnchorAndTimes(t *testing.T) {
	in := fanMeetingInput()
	draft := &TripDraft{Days: []DayDraft{
		{Activities: []ActivityDraft{
			act("note", "Berangkat dari Majalengka", "06:00", "09:30"),
			act("location", "Makan siang di Bandar Djakarta", "11:00", "12:30"),
			// The model moved the event: it must be put back at 14:00.
			act("location", "Fan Meeting di Beach City International Stadium", "15:00", "18:00"),
			act("location", "Dufan", "13:30", "15:30"),                  // clashes with the event
			act("location", "Bandara Soekarno-Hatta", "19:00", "20:00"), // overland trip
			act("location", "Bad time", "25:00", "26:00"),
			act("location", "Backwards", "20:00", "19:00"),
			act("note", "Bawa jaket", "", ""),
		}},
		{Activities: []ActivityDraft{
			act("location", "Pantai Lagoon Ancol", "09:00", "10:30"),
			act("location", "Overlap", "10:00", "11:00"),
			act("note", "Pulang ke Majalengka", "13:00", "17:00"),
		}},
	}}
	if err := validateDraft(draft, in); err != nil {
		t.Fatal(err)
	}

	titles := func(acts []ActivityDraft) []string {
		out := make([]string, len(acts))
		for i, a := range acts {
			out[i] = a.Title + " " + a.StartTime + "-" + a.EndTime
		}
		return out
	}
	day1 := titles(draft.Days[0].Activities)
	want1 := []string{
		"Berangkat dari Majalengka 06:00-09:30",
		"Makan siang di Bandar Djakarta 11:00-12:30",
		"Fan Meeting 14:00-17:00", // the user's event name, not the model's title
		"Bawa jaket -",
	}
	if strings.Join(day1, "|") != strings.Join(want1, "|") {
		t.Errorf("day 1 = %v\nwant    %v", day1, want1)
	}
	anchor := draft.Days[0].Activities[2]
	if anchor.LocationName != "Beach City International Stadium" || anchor.Lat == nil || *anchor.Lat != -6.1214 {
		t.Errorf("anchor must carry the user's venue, got %+v", anchor)
	}
	if anchor.LocationVerification != "verified" || anchor.Address != "Ancol, Jakarta Utara" {
		t.Errorf("anchor venue should be marked verified with its address, got %+v", anchor)
	}

	day2 := titles(draft.Days[1].Activities)
	want2 := []string{"Pantai Lagoon Ancol 09:00-10:30", "Pulang ke Majalengka 13:00-17:00"}
	if strings.Join(day2, "|") != strings.Join(want2, "|") {
		t.Errorf("day 2 = %v\nwant    %v", day2, want2)
	}
	if draft.Budget != in.BudgetAmount {
		t.Errorf("missing budget should fall back to the user's, got %v", draft.Budget)
	}
}

func TestValidateDraft_InsertsMissingEventAndKeepsItWhenFull(t *testing.T) {
	in := fanMeetingInput()
	acts := []ActivityDraft{}
	for i, start := range []string{"08:00", "09:00", "10:00", "11:00", "12:00", "18:00", "19:00"} {
		acts = append(acts, act("location", "Tempat "+string(rune('A'+i)), start, start[:2]+":45"))
	}
	draft := &TripDraft{Days: []DayDraft{{Activities: acts}, {}}}
	if err := validateDraft(draft, in); err != nil {
		t.Fatal(err)
	}
	day := draft.Days[0].Activities
	if len(day) != MaxActivitiesPerDay {
		t.Fatalf("want %d activities, got %d", MaxActivitiesPerDay, len(day))
	}
	found := false
	for _, a := range day {
		if a.Title == "Fan Meeting" && a.StartTime == "14:00" && a.EndTime == "17:00" {
			found = true
		}
	}
	if !found {
		t.Errorf("event anchor must be inserted when the model drops it: %+v", day)
	}
}

func TestValidateDraft_PlainTripKeepsAirports(t *testing.T) {
	in := mkInput("2026-07-01", "2026-07-01")
	draft := &TripDraft{Days: []DayDraft{{Activities: []ActivityDraft{act("location", "Haneda Airport", "09:00", "10:00")}}}}
	if err := validateDraft(draft, in); err != nil {
		t.Fatal(err)
	}
	if len(draft.Days[0].Activities) != 1 {
		t.Error("airports are only dropped for overland trips")
	}
}

func TestHaversine(t *testing.T) {
	// Jakarta (Monas) → Bandung (Gedung Sate) is ~117 km in a straight line.
	km := haversineKm(-6.1754, 106.8272, -6.9025, 107.6188)
	if km < 110 || km > 125 {
		t.Errorf("haversine = %.1f km", km)
	}
}

// A travel/queue block the model put in the event slot must not take over
// the event (seen in manual testing: "Menuju venue, parkir, dan antre masuk"
// at 14:00-17:00 replaced "Fan Meeting Byeon Woo Seok").
func TestValidateDraft_QueueBlockInEventSlotIsNotTheEvent(t *testing.T) {
	in := fanMeetingInput()
	in.Event.Name = "Fan Meeting Byeon Woo Seok"
	queue := act("note", "Menuju venue, parkir, dan antre masuk", "14:00", "17:00")
	queue.Notes = "Tiba pukul 13.00."
	draft := &TripDraft{Days: []DayDraft{{Activities: []ActivityDraft{
		act("location", "Makan siang", "10:30", "11:30"),
		queue,
	}}, {}}}
	if err := validateDraft(draft, in); err != nil {
		t.Fatal(err)
	}
	day := draft.Days[0].Activities
	if len(day) != 2 {
		t.Fatalf("want lunch + event, got %+v", day)
	}
	ev := day[1]
	if ev.Title != "Fan Meeting Byeon Woo Seok" || ev.LocationName != "Beach City International Stadium" {
		t.Errorf("event anchor = %+v", ev)
	}
	if strings.Contains(ev.Notes, "13.00") {
		t.Errorf("the queue block's notes must not become the event's: %q", ev.Notes)
	}
}

func TestMatchesEvent(t *testing.T) {
	ev := fanMeetingInput().Event
	atVenue := act("location", "Nonton di stadion", "14:00", "17:00")
	atVenue.LocationName = "Beach City International Stadium"
	for _, tt := range []struct {
		name string
		a    ActivityDraft
		want bool
	}{
		{"title names the event", act("location", "fan meeting seru", "15:00", "18:00"), true},
		{"at the venue in the event slot", atVenue, true},
		{"same slot elsewhere", act("note", "Antre masuk", "14:00", "17:00"), false},
		{"at the venue another time", func() ActivityDraft { a := atVenue; a.StartTime = "12:00"; return a }(), false},
	} {
		if got := matchesEvent(tt.a, ev); got != tt.want {
			t.Errorf("%s: matchesEvent = %v, want %v", tt.name, got, tt.want)
		}
	}
}
