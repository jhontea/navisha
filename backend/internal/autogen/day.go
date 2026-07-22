package autogen

import (
	"encoding/json"
	"fmt"
	"regexp"
	"sort"
	"strings"
)

var dayTimePattern = regexp.MustCompile(`^(?:[01]\d|2[0-3]):[0-5]\d$`)

func BuildDayPrompt(ctx DayContext, instruction string) (string, string) {
	maxSuggestions := MaxActivitiesPerDay - len(ctx.Existing)
	if maxSuggestions < 1 {
		maxSuggestions = 1
	}
	if maxSuggestions > 5 {
		maxSuggestions = 5
	}

	anchors := "No existing activities. The day is empty."
	if len(ctx.Existing) > 0 {
		lines := make([]string, 0, len(ctx.Existing))
		for _, a := range ctx.Existing {
			location := a.LocationName
			if location == "" {
				location = a.Title
			}
			lines = append(lines, fmt.Sprintf("- %s-%s: %s (%s)", a.StartTime, a.EndTime, a.Title, location))
		}
		anchors = strings.Join(lines, "\n")
	}

	system := `You are a practical travel itinerary planner. Suggest only NEW place-based activities for one day.
Existing activities are fixed anchors: never edit, move, replace, or duplicate them.
Fit suggestions into free time, use realistic travel pacing, and keep locations geographically sensible.
Return strict JSON matching the supplied schema. Use HH:MM 24-hour time. Do not invent coordinates, addresses, or place IDs.`
	user := fmt.Sprintf(`Trip: %s
Destination / area: %s
Day %d: %s
Day title: %s

Existing fixed activities:
%s

User preference: %s

Suggest between 1 and %d new activities. If the day is empty, make a balanced day. If anchors exist, build around them. Do not overlap their times.`,
		ctx.TripTitle, ctx.Destination, ctx.DayNumber, ctx.Date, ctx.DayTitle,
		anchors, strings.TrimSpace(instruction), maxSuggestions)
	return system, user
}

func DayJSONSchema() any {
	activityProps := map[string]any{
		"type":            map[string]any{"type": "string", "enum": []string{"location"}},
		"title":           map[string]any{"type": "string"},
		"start_time":      map[string]any{"type": "string"},
		"end_time":        map[string]any{"type": "string"},
		"location_name":   map[string]any{"type": "string"},
		"address":         map[string]any{"type": "string"},
		"lat":             map[string]any{"type": []string{"number", "null"}},
		"lng":             map[string]any{"type": []string{"number", "null"}},
		"google_place_id": map[string]any{"type": "string"},
		"category":        map[string]any{"type": "string"},
		"notes":           map[string]any{"type": "string"},
	}
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"ok":     map[string]any{"type": "boolean"},
			"reason": map[string]any{"type": "string"},
			"theme":  map[string]any{"type": "string"},
			"activities": map[string]any{"type": "array", "items": map[string]any{
				"type": "object", "properties": activityProps,
				"required":             []string{"type", "title", "start_time", "end_time", "location_name", "address", "lat", "lng", "google_place_id", "category", "notes"},
				"additionalProperties": false,
			}},
		},
		"required":             []string{"ok", "reason", "theme", "activities"},
		"additionalProperties": false,
	}
}

func ParseAndValidateDayPreview(raw string, ctx DayContext) (*DayPreview, error) {
	var response dayLLMResponse
	if err := json.Unmarshal([]byte(stripFence(raw)), &response); err != nil {
		return nil, fmt.Errorf("autogen: parse day preview: %w", err)
	}
	if !response.OK {
		return nil, fmt.Errorf("%w: %s", ErrInvalidPrompt, strings.TrimSpace(response.Reason))
	}

	existing := make(map[string]bool, len(ctx.Existing)*2)
	occupied := make([][2]int, 0, len(ctx.Existing)+MaxActivitiesPerDay)
	for _, anchor := range ctx.Existing {
		existing[strings.ToLower(strings.TrimSpace(anchor.Title))] = true
		existing[strings.ToLower(strings.TrimSpace(anchor.LocationName))] = true
		if start, startOK := dayMinutes(anchor.StartTime); startOK {
			if end, endOK := dayMinutes(anchor.EndTime); endOK && end > start {
				occupied = append(occupied, [2]int{start, end})
			}
		}
	}
	limit := MaxActivitiesPerDay - len(ctx.Existing)
	if limit < 1 {
		limit = 1
	}
	if limit > 5 {
		limit = 5
	}

	valid := make([]ActivityDraft, 0, limit)
	seen := map[string]bool{}
	for _, activity := range response.Activities {
		activity.Title = strings.TrimSpace(activity.Title)
		activity.LocationName = strings.TrimSpace(activity.LocationName)
		if activity.Type != "location" || activity.Title == "" {
			continue
		}
		if activity.LocationName == "" {
			activity.LocationName = activity.Title
		}
		key := strings.ToLower(activity.Title)
		locationKey := strings.ToLower(activity.LocationName)
		if existing[key] || existing[locationKey] || seen[key] || seen[locationKey] {
			continue
		}
		if !dayTimePattern.MatchString(activity.StartTime) || !dayTimePattern.MatchString(activity.EndTime) || activity.EndTime <= activity.StartTime {
			continue
		}
		start, _ := dayMinutes(activity.StartTime)
		end, _ := dayMinutes(activity.EndTime)
		overlaps := false
		for _, slot := range occupied {
			if start < slot[1] && slot[0] < end {
				overlaps = true
				break
			}
		}
		if overlaps {
			continue
		}
		activity.Lat, activity.Lng = nil, nil
		activity.Address, activity.GooglePlaceID = "", ""
		activity.Category = sanitizeCategory(activity.Category)
		seen[key], seen[locationKey] = true, true
		occupied = append(occupied, [2]int{start, end})
		valid = append(valid, activity)
		if len(valid) == limit {
			break
		}
	}
	if len(valid) == 0 {
		return nil, fmt.Errorf("%w: no usable day suggestions", ErrInvalidPrompt)
	}
	sort.SliceStable(valid, func(i, j int) bool { return valid[i].StartTime < valid[j].StartTime })
	return &DayPreview{Theme: strings.TrimSpace(response.Theme), Activities: valid}, nil
}

func dayMinutes(value string) (int, bool) {
	if !dayTimePattern.MatchString(value) {
		return 0, false
	}
	return int(value[0]-'0')*600 + int(value[1]-'0')*60 + int(value[3]-'0')*10 + int(value[4]-'0'), true
}
