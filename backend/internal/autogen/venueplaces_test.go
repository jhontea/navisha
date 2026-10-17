package autogen

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"
)

type fakeFinder struct {
	mu     sync.Mutex
	byKind map[string][]NearbyPlace
	fail   map[string]bool
	asked  []string
}

func (f *fakeFinder) FindNearby(_ context.Context, kind string, _, _ float64, _, _ int) ([]NearbyPlace, error) {
	f.mu.Lock()
	f.asked = append(f.asked, kind)
	f.mu.Unlock()
	if f.fail[kind] {
		return nil, errors.New("provider down")
	}
	return f.byKind[kind], nil
}

// ancolPlaces are real places near Beach City International Stadium.
func ancolPlaces() *fakeFinder {
	return &fakeFinder{byKind: map[string][]NearbyPlace{
		PlaceKindHotel: {
			{ID: "h-mercure", Name: "Mercure Hotel Ancol", Address: "Jalan Pantai Indah, Pademangan", Lat: -6.12, Lng: 106.83, DistanceMeters: 318},
			{ID: "h-dafam", Name: "Grand Dafam Ancol", Address: "Jalan Lodan Raya 2A, Pademangan", Lat: -6.13, Lng: 106.83, DistanceMeters: 918},
		},
		PlaceKindFood: {
			{ID: "f-aw", Name: "A&W", Address: "Ancol", DistanceMeters: 122},
			{ID: "f-bandar", Name: "Bandar Djakarta", Address: "Pantai Indah, Pademangan", Lat: -6.125, Lng: 106.84, DistanceMeters: 1080},
			{ID: "f-aw2", Name: "A&W", Address: "Ancol 2", DistanceMeters: 1500}, // same chain, farther
		},
		PlaceKindPlayground: {
			{ID: "p-gor", Name: "Playground umum Jalan GOR Kecamatan Pademangan", Address: "Jalan GOR Kecamatan Pademangan", Lat: -6.13, Lng: 106.84, DistanceMeters: 1278},
		},
	}}
}

func TestFindVenuePlaces_RefsAndGating(t *testing.T) {
	in := fanMeetingInput() // hotel + playground needs
	got := findVenuePlaces(context.Background(), ancolPlaces(), in)
	var refs []string
	for _, p := range got {
		refs = append(refs, p.Ref+"="+p.Name)
	}
	want := "H1=Mercure Hotel Ancol,H2=Grand Dafam Ancol,F1=A&W,F2=Bandar Djakarta,P1=Playground umum Jalan GOR Kecamatan Pademangan"
	if strings.Join(refs, ",") != want {
		t.Errorf("refs = %v", refs)
	}

	// Food is always looked up; hotels and playgrounds only when asked for.
	in.Needs = nil
	finder := ancolPlaces()
	got = findVenuePlaces(context.Background(), finder, in)
	if len(finder.asked) != 1 || finder.asked[0] != PlaceKindFood || len(got) != 2 {
		t.Errorf("asked %v, got %+v", finder.asked, got)
	}

	// No venue coordinates: nothing to search around.
	in.Event.Venue.Lat, in.Event.Venue.Lng = nil, nil
	if got := findVenuePlaces(context.Background(), ancolPlaces(), in); got != nil {
		t.Errorf("want nil without venue coordinates, got %+v", got)
	}
}

func TestFindVenuePlaces_ProviderErrorIsSkipped(t *testing.T) {
	finder := ancolPlaces()
	finder.fail = map[string]bool{PlaceKindHotel: true}
	got := findVenuePlaces(context.Background(), finder, fanMeetingInput())
	for _, p := range got {
		if p.Kind == PlaceKindHotel {
			t.Fatalf("hotel from a failed lookup: %+v", p)
		}
	}
	if len(got) != 3 {
		t.Errorf("food and playground should remain, got %+v", got)
	}
}

func TestBuildPrompt_ListsVenuePlaces(t *testing.T) {
	in := fanMeetingInput()
	in.Nearby = findVenuePlaces(context.Background(), ancolPlaces(), in)
	system, user := BuildPrompt(in)
	for _, want := range []string{"DAFTAR TEMPAT NYATA", `"candidate_id"`, "WAJIB dari daftar hotel", "BUKAN taman hiburan berbayar"} {
		if !strings.Contains(system, want) {
			t.Errorf("system prompt missing %q", want)
		}
	}
	for _, want := range []string{"[H2] Grand Dafam Ancol — 0.9 km", "[F2] Bandar Djakarta", "[P1] Playground umum"} {
		if !strings.Contains(user, want) {
			t.Errorf("user prompt missing %q:\n%s", want, user)
		}
	}

	plain, _ := BuildPrompt(fanMeetingInput())
	if strings.Contains(plain, "DAFTAR TEMPAT NYATA") {
		t.Error("no list rules without candidates")
	}
}

func TestValidateDraft_PinsVenuePlaces(t *testing.T) {
	in := fanMeetingInput()
	in.Nearby = findVenuePlaces(context.Background(), ancolPlaces(), in)
	lunch := act("location", "Makan siang seafood", "11:00", "12:30")
	lunch.CandidateID = "F2"
	lunch.LocationName = "Restoran seafood tepi laut" // display name without the place's name
	dinner := act("location", "Makan malam di Bandar Djakarta", "18:00", "19:30")
	dinner.Category = "kuliner"
	invented := act("location", "Makan malam di Mangga Dua Square", "19:30", "20:30")
	invented.CandidateID = "F9" // no such candidate
	play := act("location", "Main di playground", "08:00", "09:00")
	play.CandidateID = "p1"

	d := &TripDraft{
		Days: []DayDraft{{Activities: []ActivityDraft{lunch, dinner, invented}}, {Activities: []ActivityDraft{play}}},
		Lodging: []LodgingDraft{{
			Name: "Grand Ancol Hotel", CheckInDate: "2026-11-07", CheckInTime: "18:00",
			CheckOutDate: "2026-11-08", CheckOutTime: "12:00", CandidateID: "",
		}},
	}
	if err := validateDraft(d, in); err != nil {
		t.Fatal(err)
	}
	byTitle := map[string]ActivityDraft{}
	for _, day := range d.Days {
		for _, a := range day.Activities {
			byTitle[a.Title] = a
			if a.CandidateID != "" {
				t.Errorf("candidate_id must be cleared: %+v", a)
			}
		}
	}
	if a := byTitle["Makan siang seafood"]; a.GooglePlaceID != "f-bandar" || a.LocationName != "Bandar Djakarta" || a.Lat == nil || a.LocationVerification != "verified" {
		t.Errorf("lunch by ref = %+v", a)
	}
	if a := byTitle["Makan malam di Bandar Djakarta"]; a.GooglePlaceID != "f-bandar" {
		t.Errorf("dinner by name = %+v", a)
	}
	if a := byTitle["Makan malam di Mangga Dua Square"]; a.Lat != nil || a.LocationVerification != "" {
		t.Errorf("unknown place must be left for the resolver: %+v", a)
	}
	if a := byTitle["Main di playground"]; a.GooglePlaceID != "p-gor" {
		t.Errorf("playground by lower-case ref = %+v", a)
	}

	st := d.Lodging[0]
	if st.Name != "Mercure Hotel Ancol" || st.GooglePlaceID != "h-mercure" || st.Lat == nil || !strings.Contains(st.Notes, "0.3 km") {
		t.Errorf("invented hotel should become the nearest real one: %+v", st)
	}
}

func TestValidateDraft_StayByRefKeepsChoice(t *testing.T) {
	in := fanMeetingInput()
	in.Nearby = findVenuePlaces(context.Background(), ancolPlaces(), in)
	d := &TripDraft{
		Days: []DayDraft{{}, {}},
		Lodging: []LodgingDraft{{
			Name: "Grand Dafam", CandidateID: "H2", Notes: "Dekat pintu Ancol.",
			CheckInDate: "2026-11-07", CheckOutDate: "2026-11-08",
		}},
	}
	if err := validateDraft(d, in); err != nil {
		t.Fatal(err)
	}
	if st := d.Lodging[0]; st.Name != "Grand Dafam Ancol" || st.GooglePlaceID != "h-dafam" || st.Notes != "Dekat pintu Ancol." {
		t.Errorf("stay = %+v", st)
	}
}

func TestValidateDraft_NoHotelCandidatesKeepsStay(t *testing.T) {
	in := fanMeetingInput()
	in.Needs = nil // no hotel lookup
	in.Nearby = findVenuePlaces(context.Background(), ancolPlaces(), in)
	d := &TripDraft{Days: []DayDraft{{}, {}}, Lodging: []LodgingDraft{{Name: "Hotel X", CheckInDate: "2026-11-07", CheckOutDate: "2026-11-08"}}}
	if err := validateDraft(d, in); err != nil {
		t.Fatal(err)
	}
	if st := d.Lodging[0]; st.Name != "Hotel X" || st.Lat != nil {
		t.Errorf("stay = %+v", st)
	}
}

func TestSuggestedDeparture(t *testing.T) {
	in := fanMeetingInput() // Majalengka -> Ancol by car, event 14:00 on day 1
	if got := suggestedDeparture(in); got != "08:00" {
		t.Errorf("suggestedDeparture = %q, want 08:00", got)
	}
	_, user := BuildPrompt(in)
	if !strings.Contains(user, "Saran jam berangkat (hari pertama): sekitar 08:00") {
		t.Errorf("user prompt missing suggestion:\n%s", user)
	}

	in.DepartTime = "06:30"
	_, user = BuildPrompt(in)
	if !strings.Contains(user, "Jam berangkat dari asal (hari pertama): sekitar 06:30") || strings.Contains(user, "Saran jam") {
		t.Errorf("user prompt should use the given time:\n%s", user)
	}

	in = fanMeetingInput()
	in.Event.StartTime = "06:00" // would mean leaving the night before
	if got := suggestedDeparture(in); got != "" {
		t.Errorf("want no suggestion, got %q", got)
	}
	in = fanMeetingInput()
	in.Event.Date = in.EndDate // event not on the travel day
	if got := suggestedDeparture(in); got != "" {
		t.Errorf("want no suggestion, got %q", got)
	}
}

func TestValidateBookings_KeepsDepartTime(t *testing.T) {
	in := fanMeetingInput()
	in.DepartTime = "08:00"
	d := &TripDraft{TransportLegs: []TransportLegDraft{
		leg("car", "Ancol", "Majalengka", "2026-11-08", "13:00", "2026-11-08", "17:30"),
		leg("car", "Majalengka", "Ancol", "2026-11-07", "05:00", "2026-11-07", "09:15"),
	}}
	validateBookings(d, in)
	out := d.TransportLegs[1]
	if out.DepartureTime != "08:00" || out.ArrivalTime != "12:15" || out.ArrivalDate != "2026-11-07" {
		t.Errorf("first leg = %+v", out)
	}
	if d.TransportLegs[0].DepartureTime != "13:00" {
		t.Errorf("return leg must not move: %+v", d.TransportLegs[0])
	}

	// Within the slack the model's time stays.
	d = &TripDraft{TransportLegs: []TransportLegDraft{leg("car", "Majalengka", "Ancol", "2026-11-07", "07:30", "2026-11-07", "11:30")}}
	validateBookings(d, in)
	if d.TransportLegs[0].DepartureTime != "07:30" {
		t.Errorf("leg within slack moved: %+v", d.TransportLegs[0])
	}
}

func TestValidateInput_DepartTime(t *testing.T) {
	in := fanMeetingInput()
	in.DepartTime = "07:00"
	if err := ValidateInput(in); err != nil {
		t.Fatalf("valid depart time rejected: %v", err)
	}
	in.DepartTime = "7am"
	if err := ValidateInput(in); err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Errorf("bad depart time accepted: %v", err)
	}
	in.DepartTime = "07:00"
	in.Origin = nil
	if err := ValidateInput(in); err == nil || !strings.Contains(err.Error(), "starting point") {
		t.Errorf("depart time without origin accepted: %v", err)
	}
}
