package autogen

import (
	"strings"
	"time"
)

const dateLayout = "2006-01-02"

// validateBookings cleans the draft's transport legs, lodging and budget
// split in place. It returns, per date (YYYY-MM-DD), the time slots the kept
// legs occupy so the day schedule can keep activities out of them.
//
// Rules: dates inside the trip, HH:MM times, arrival after departure,
// check-out after check-in, no negative money, no airport legs on an
// overland trip, and no leg that clashes with the event anchor.
func validateBookings(d *TripDraft, in GenerateInput) map[string][][2]int {
	first := in.StartDate.Format(dateLayout)
	last := in.EndDate.Format(dateLayout)
	inTrip := func(date string) bool {
		_, err := time.Parse(dateLayout, date)
		return err == nil && date >= first && date <= last
	}

	var eventDate string
	var eventSlot [2]int
	if ev := in.Event; ev != nil {
		eventDate = ev.Date.Format(dateLayout)
		eventSlot[0], _ = dayMinutes(ev.StartTime)
		eventSlot[1], _ = dayMinutes(ev.EndTime)
	}

	slots := map[string][][2]int{}
	legs := make([]TransportLegDraft, 0, len(d.TransportLegs))
	for _, leg := range d.TransportLegs {
		leg.Mode = strings.ToLower(strings.TrimSpace(leg.Mode))
		leg.Label = strings.TrimSpace(leg.Label)
		leg.FromLocation = strings.TrimSpace(leg.FromLocation)
		leg.ToLocation = strings.TrimSpace(leg.ToLocation)
		leg.Notes = strings.TrimSpace(leg.Notes)
		if !LegModes[leg.Mode] || leg.FromLocation == "" || leg.ToLocation == "" {
			continue
		}
		if in.avoidsAirports() && (leg.Mode == "flight" || legMentionsAirport(leg)) {
			continue
		}
		if !inTrip(leg.DepartureDate) || !inTrip(leg.ArrivalDate) {
			continue
		}
		dep, depOK := dayMinutes(leg.DepartureTime)
		arr, arrOK := dayMinutes(leg.ArrivalTime)
		if !depOK || !arrOK {
			continue
		}
		if leg.ArrivalDate < leg.DepartureDate || (leg.ArrivalDate == leg.DepartureDate && arr <= dep) {
			continue
		}
		legSlots := map[string][2]int{}
		if leg.DepartureDate == leg.ArrivalDate {
			legSlots[leg.DepartureDate] = [2]int{dep, arr}
		} else {
			legSlots[leg.DepartureDate] = [2]int{dep, 24 * 60}
			legSlots[leg.ArrivalDate] = [2]int{0, arr}
		}
		if s, ok := legSlots[eventDate]; ok && eventDate != "" && s[0] < eventSlot[1] && eventSlot[0] < s[1] {
			continue // the event never moves; a leg through it is wrong
		}
		if leg.EstimatedCost < 0 {
			leg.EstimatedCost = 0
		}
		if leg.Label == "" {
			leg.Label = leg.FromLocation + " → " + leg.ToLocation
		}
		for date, s := range legSlots {
			slots[date] = append(slots[date], s)
		}
		legs = append(legs, leg)
		if len(legs) == MaxTransportLegs {
			break
		}
	}
	d.TransportLegs = legs

	stays := make([]LodgingDraft, 0, len(d.Lodging))
	for _, st := range d.Lodging {
		st.Name = strings.TrimSpace(st.Name)
		st.LocationName = strings.TrimSpace(st.LocationName)
		st.PlaceQuery = strings.TrimSpace(st.PlaceQuery)
		st.City = strings.TrimSpace(st.City)
		st.Notes = strings.TrimSpace(st.Notes)
		if st.Name == "" || !inTrip(st.CheckInDate) || !inTrip(st.CheckOutDate) || st.CheckOutDate <= st.CheckInDate {
			continue
		}
		if !optionalTime(st.CheckInTime) || !optionalTime(st.CheckOutTime) {
			continue
		}
		if st.LocationName == "" {
			st.LocationName = st.Name
		}
		st.CheckOutTime = checkOutTime(st, legs)
		if st.EstimatedCostPerNight < 0 {
			st.EstimatedCostPerNight = 0
		}
		// Coordinates and place IDs come from the frontend resolver only.
		st.Lat, st.Lng, st.Address, st.GooglePlaceID = nil, nil, "", ""
		stays = append(stays, st)
		if len(stays) == MaxLodging {
			break
		}
	}
	d.Lodging = stays

	b := &d.BudgetBreakdown
	for _, v := range []*float64{&b.Transport, &b.Accommodation, &b.Food, &b.Activity, &b.Other} {
		if *v < 0 {
			*v = 0
		}
	}
	// The split is the plan the user sees; the total follows it.
	if total := b.Total(); total > 0 {
		d.Budget = total
	}
	return slots
}

// standardCheckOut is used when the model picks an early check-out (before
// earliestCheckOut) that nothing in the plan needs.
const (
	standardCheckOut = "12:00"
	earliestCheckOut = 10 * 60
)

// checkOutTime keeps a check-out before 10:00 only when a kept leg leaves on
// the check-out day before noon; otherwise it moves to the usual 12:00.
// (Models like to check out at 08:30 and then spend the morning nearby.)
func checkOutTime(st LodgingDraft, legs []TransportLegDraft) string {
	out, ok := dayMinutes(st.CheckOutTime)
	if !ok || out >= earliestCheckOut {
		return st.CheckOutTime
	}
	noon, _ := dayMinutes(standardCheckOut)
	for _, leg := range legs {
		if dep, _ := dayMinutes(leg.DepartureTime); leg.DepartureDate == st.CheckOutDate && dep < noon {
			return st.CheckOutTime
		}
	}
	return standardCheckOut
}

func optionalTime(v string) bool {
	if v == "" {
		return true
	}
	_, ok := dayMinutes(v)
	return ok
}

func legMentionsAirport(leg TransportLegDraft) bool {
	hay := strings.ToLower(leg.Label + " " + leg.FromLocation + " " + leg.ToLocation)
	return strings.Contains(hay, "bandara") || strings.Contains(hay, "airport")
}
