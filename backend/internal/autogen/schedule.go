package autogen

import (
	"sort"
	"strings"
)

// eventCategory is the category given to the event anchor: the schema has no
// "event" category and the anchor is an outing, not food or lodging.
const eventCategory = "budaya"

// normalizeDaySchedule applies the same time rules as the day preview to one
// day of a full-trip draft: timed activities need HH:MM times that end after
// they start and must not overlap; activities with no times at all are kept
// after the timed ones (a half-filled or malformed time is dropped). When
// the event falls on this day its anchor is placed first and wins every
// clash; blocked holds the slots of the day's transport legs, which no
// activity may overlap. Activities are capped at MaxActivitiesPerDay.
func normalizeDaySchedule(acts []ActivityDraft, anchor *ActivityDraft, blocked [][2]int, noAirport bool) []ActivityDraft {
	timed := make([]ActivityDraft, 0, len(acts)+1)
	untimed := []ActivityDraft{}
	occupied := [][2]int{}
	if anchor != nil {
		start, _ := dayMinutes(anchor.StartTime)
		end, _ := dayMinutes(anchor.EndTime)
		occupied = append(occupied, [2]int{start, end})
		timed = append(timed, *anchor)
	}
	occupied = append(occupied, blocked...)

	sorted := append([]ActivityDraft(nil), acts...)
	sort.SliceStable(sorted, func(i, j int) bool { return sorted[i].StartTime < sorted[j].StartTime })
	for _, a := range sorted {
		if noAirport && mentionsAirport(a) {
			continue
		}
		if a.StartTime == "" && a.EndTime == "" {
			untimed = append(untimed, a)
			continue
		}
		start, startOK := dayMinutes(a.StartTime)
		end, endOK := dayMinutes(a.EndTime)
		if !startOK || !endOK || end <= start {
			continue
		}
		clash := false
		for _, slot := range occupied {
			if start < slot[1] && slot[0] < end {
				clash = true
				break
			}
		}
		if clash {
			continue
		}
		occupied = append(occupied, [2]int{start, end})
		timed = append(timed, a)
	}
	sort.SliceStable(timed, func(i, j int) bool { return timed[i].StartTime < timed[j].StartTime })

	out := append(timed, untimed...)
	if len(out) > MaxActivitiesPerDay {
		// Keep the anchor even when the model filled the day.
		room := MaxActivitiesPerDay
		if anchor != nil {
			room--
		}
		trimmed := out[:0:0]
		for _, a := range out {
			if isAnchor(a, anchor) {
				trimmed = append(trimmed, a)
			} else if room > 0 {
				trimmed = append(trimmed, a)
				room--
			}
		}
		out = trimmed
	}
	return out
}

func isAnchor(a ActivityDraft, anchor *ActivityDraft) bool {
	return anchor != nil && a.Title == anchor.Title && a.StartTime == anchor.StartTime && a.EndTime == anchor.EndTime
}

// eventAnchor builds the fixed event activity from user input: title, venue
// and times always come from the user. When the model wrote the event itself
// its notes are kept and that activity is removed from acts so it is not
// scheduled twice. Anything else in the event slot (a "queue at the gate"
// block the model put there) loses the clash in normalizeDaySchedule.
func eventAnchor(ev *EventInput, acts []ActivityDraft) (ActivityDraft, []ActivityDraft) {
	anchor := ActivityDraft{
		Type:         "location",
		Title:        strings.TrimSpace(ev.Name),
		StartTime:    ev.StartTime,
		EndTime:      ev.EndTime,
		LocationName: strings.TrimSpace(ev.Venue.Label),
		PlaceQuery:   strings.TrimSpace(ev.Venue.Label),
		Category:     eventCategory,
		Notes:        "Acara utama perjalanan ini. Datang lebih awal untuk antre masuk dan cari parkir.",
	}
	if ev.Venue.hasCoords() {
		lat, lng := *ev.Venue.Lat, *ev.Venue.Lng
		anchor.Lat, anchor.Lng = &lat, &lng
		anchor.Address = strings.TrimSpace(ev.Venue.Address)
		anchor.LocationVerification = "verified"
	}

	rest := acts[:0:0]
	matched := false
	for _, a := range acts {
		if !matched && matchesEvent(a, ev) {
			matched = true
			if n := strings.TrimSpace(a.Notes); n != "" {
				anchor.Notes = n
			}
			if anchor.Lat == nil {
				anchor.City = a.City
			}
			continue
		}
		rest = append(rest, a)
	}
	return anchor, rest
}

// matchesEvent reports whether the model's activity is the event itself: its
// title names the event, or it sits at the venue in exactly the event slot.
// Same times alone are not enough (that was a travel or queue block).
func matchesEvent(a ActivityDraft, ev *EventInput) bool {
	contains := func(hay, needle string) bool {
		needle = strings.ToLower(strings.TrimSpace(needle))
		return needle != "" && strings.Contains(strings.ToLower(hay), needle)
	}
	if contains(a.Title, ev.Name) {
		return true
	}
	sameSlot := a.StartTime == ev.StartTime && a.EndTime == ev.EndTime
	return sameSlot && contains(a.LocationName+" "+a.PlaceQuery, ev.Venue.Label)
}

func mentionsAirport(a ActivityDraft) bool {
	hay := strings.ToLower(a.Title + " " + a.LocationName + " " + a.PlaceQuery)
	return strings.Contains(hay, "bandara") || strings.Contains(hay, "airport")
}
