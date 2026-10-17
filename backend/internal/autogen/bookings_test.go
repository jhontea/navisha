package autogen

import (
	"strings"
	"testing"
)

func leg(mode, from, to, depDate, depTime, arrDate, arrTime string) TransportLegDraft {
	return TransportLegDraft{
		Mode: mode, FromLocation: from, ToLocation: to,
		DepartureDate: depDate, DepartureTime: depTime, ArrivalDate: arrDate, ArrivalTime: arrTime,
		EstimatedCost: 450000,
	}
}

func TestValidateBookings_Legs(t *testing.T) {
	in := fanMeetingInput() // 7-8 Nov, car, event 14:00-17:00 on the 7th
	d := &TripDraft{TransportLegs: []TransportLegDraft{
		leg("car", "Majalengka", "Ancol", "2026-11-07", "04:00", "2026-11-07", "08:00"),
		leg("CAR ", "Ancol", "Majalengka", "2026-11-08", "13:00", "2026-11-08", "17:30"),
		leg("flight", "Kertajati", "Jakarta", "2026-11-07", "05:00", "2026-11-07", "06:00"), // overland trip
		leg("car", "Bandara Kertajati", "Ancol", "2026-11-07", "05:00", "2026-11-07", "07:00"),
		leg("car", "Majalengka", "Ancol", "2026-11-07", "13:00", "2026-11-07", "15:00"), // through the event
		leg("car", "Majalengka", "Ancol", "2026-11-06", "04:00", "2026-11-06", "08:00"), // before the trip
		leg("car", "Majalengka", "Ancol", "2026-11-08", "10:00", "2026-11-08", "09:00"), // arrives first
		leg("car", "Majalengka", "Ancol", "2026-11-08", "4am", "2026-11-08", "09:00"),
		leg("boat", "Majalengka", "Ancol", "2026-11-08", "04:00", "2026-11-08", "09:00"),
		leg("car", "", "Ancol", "2026-11-08", "04:00", "2026-11-08", "09:00"),
	}}
	slots := validateBookings(d, in)

	if len(d.TransportLegs) != 2 {
		t.Fatalf("want 2 legs kept, got %+v", d.TransportLegs)
	}
	if d.TransportLegs[1].Mode != "car" || d.TransportLegs[0].Label != "Majalengka → Ancol" {
		t.Errorf("legs not cleaned: %+v", d.TransportLegs)
	}
	if got := slots["2026-11-07"]; len(got) != 1 || got[0] != [2]int{240, 480} {
		t.Errorf("day 1 slots = %v", got)
	}
	if got := slots["2026-11-08"]; len(got) != 1 || got[0] != [2]int{780, 1050} {
		t.Errorf("day 2 slots = %v", got)
	}
}

func TestValidateBookings_OvernightLegBlocksBothDays(t *testing.T) {
	in := mkInput("2026-07-01", "2026-07-03")
	d := &TripDraft{TransportLegs: []TransportLegDraft{leg("train", "Jakarta", "Surabaya", "2026-07-01", "21:00", "2026-07-02", "05:30")}}
	slots := validateBookings(d, in)
	if slots["2026-07-01"][0] != [2]int{1260, 1440} || slots["2026-07-02"][0] != [2]int{0, 330} {
		t.Errorf("slots = %v", slots)
	}
	if len(d.TransportLegs) != 1 {
		t.Error("a plain trip keeps a train leg")
	}
}

func TestValidateBookings_LodgingAndBudget(t *testing.T) {
	in := fanMeetingInput()
	lat := 1.0
	d := &TripDraft{
		Budget: 3500000,
		Lodging: []LodgingDraft{
			{Name: " Mercure Ancol ", CheckInDate: "2026-11-07", CheckInTime: "18:00", CheckOutDate: "2026-11-08", CheckOutTime: "12:00", EstimatedCostPerNight: 950000, Lat: &lat, GooglePlaceID: "x"},
			{Name: "Same day", CheckInDate: "2026-11-08", CheckOutDate: "2026-11-08"},
			{Name: "Bad time", CheckInDate: "2026-11-07", CheckInTime: "6pm", CheckOutDate: "2026-11-08"},
			{Name: "", CheckInDate: "2026-11-07", CheckOutDate: "2026-11-08"},
			{Name: "After trip", CheckInDate: "2026-11-08", CheckOutDate: "2026-11-09"},
		},
		BudgetBreakdown: BudgetBreakdown{Transport: 880000, Accommodation: 950000, Food: 650000, Activity: 270000, Other: -5},
	}
	validateBookings(d, in)
	if len(d.Lodging) != 1 {
		t.Fatalf("want 1 stay, got %+v", d.Lodging)
	}
	st := d.Lodging[0]
	if st.Name != "Mercure Ancol" || st.LocationName != "Mercure Ancol" || st.Lat != nil || st.GooglePlaceID != "" {
		t.Errorf("stay not cleaned: %+v", st)
	}
	if d.BudgetBreakdown.Other != 0 {
		t.Error("negative category must become 0")
	}
	if d.Budget != 2750000 {
		t.Errorf("budget should follow the split, got %v", d.Budget)
	}
	cats := d.BudgetBreakdown.Categories()
	if len(cats) != 4 || cats["transport"] != 880000 {
		t.Errorf("categories = %v", cats)
	}
}

func TestValidateDraft_ActivitiesStayOutOfLegs(t *testing.T) {
	in := fanMeetingInput()
	draft := &TripDraft{
		TransportLegs: []TransportLegDraft{leg("car", "Majalengka", "Ancol", "2026-11-07", "04:00", "2026-11-07", "08:30")},
		Days: []DayDraft{{Activities: []ActivityDraft{
			act("location", "Sarapan di rest area", "07:00", "07:45"), // during the drive
			act("location", "Makan siang di Bandar Djakarta", "11:00", "12:30"),
		}}, {}},
	}
	if err := validateDraft(draft, in); err != nil {
		t.Fatal(err)
	}
	for _, a := range draft.Days[0].Activities {
		if a.Title == "Sarapan di rest area" {
			t.Error("an activity inside a transport leg must be dropped")
		}
	}
	if len(draft.Days[0].Activities) != 2 { // lunch + the event anchor
		t.Errorf("day 1 = %+v", draft.Days[0].Activities)
	}
}

func TestParseAndValidate_OldDraftWithoutBookings(t *testing.T) {
	raw := `{"ok":true,"reason":"","trip":{"title":"T","base_currency":"IDR","budget":100,"tips":[],"days":[
		{"day_number":1,"date":"x","activities":[]}]}}`
	draft, err := ParseAndValidate(raw, mkInput("2026-07-01", "2026-07-01"))
	if err != nil {
		t.Fatal(err)
	}
	if draft.TransportLegs == nil || draft.Lodging == nil || draft.Budget != 100 {
		t.Errorf("missing bookings should become empty lists and keep the budget: %+v", draft)
	}
}

func TestBuildPrompt_BookingRules(t *testing.T) {
	system, _ := BuildPrompt(fanMeetingInput())
	for _, want := range []string{
		`"transport_legs"`, `"lodging"`, `"budget_breakdown"`,
		"TIDAK ditulis sebagai aktivitas",
		"WAJIB berisi leg berangkat",
		`Isi "lodging" dengan SATU hotel`,
	} {
		if !strings.Contains(system, want) {
			t.Errorf("system prompt missing %q", want)
		}
	}
	if strings.Contains(system, `"note" berangkat dari kota asal`) {
		t.Error("the origin trip must no longer be written as a note")
	}
}

func TestJSONSchema_HasBookings(t *testing.T) {
	trip := JSONSchema().(map[string]any)["properties"].(map[string]any)["trip"].(map[string]any)
	props := trip["properties"].(map[string]any)
	for _, k := range []string{"transport_legs", "lodging", "budget_breakdown"} {
		if _, ok := props[k]; !ok {
			t.Errorf("schema missing %s", k)
		}
	}
	required := strings.Join(trip["required"].([]string), ",")
	if !strings.Contains(required, "budget_breakdown") {
		t.Error("strict schema must require budget_breakdown")
	}
}
