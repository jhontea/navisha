package autogen

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"regexp"
	"strings"
)

// ErrInvalidInput is returned when the user-supplied form data fails validation
// (empty, too long, garbage, or out-of-range dates). Maps to HTTP 422.
var ErrInvalidInput = errors.New("invalid generate input")

// ErrInvalidPrompt is returned when the LLM declines the request (ok=false) or
// returns a draft that fails structural validation. Maps to HTTP 422.
var ErrInvalidPrompt = errors.New("prompt did not describe a valid trip")

var ErrDayNotFound = errors.New("trip day not found")

// hasLetter requires at least one unicode letter — rejects pure-symbol/number garbage.
var hasLetter = regexp.MustCompile(`\p{L}`)

// ValidateInput checks the form data before any LLM call. Keeps cost down by
// rejecting obvious garbage early.
func ValidateInput(in GenerateInput) error {
	dest := strings.TrimSpace(in.Destination)
	if dest == "" {
		return fmt.Errorf("%w: destination required", ErrInvalidInput)
	}
	if len(dest) > MaxDestinationLen {
		return fmt.Errorf("%w: destination too long (max %d)", ErrInvalidInput, MaxDestinationLen)
	}
	if !hasLetter.MatchString(dest) {
		return fmt.Errorf("%w: destination must contain letters", ErrInvalidInput)
	}
	if len(in.Description) > MaxDescriptionLen {
		return fmt.Errorf("%w: description too long (max %d)", ErrInvalidInput, MaxDescriptionLen)
	}
	if in.StartDate.IsZero() || in.EndDate.IsZero() {
		return fmt.Errorf("%w: start and end dates required", ErrInvalidInput)
	}
	if in.EndDate.Before(in.StartDate) {
		return fmt.Errorf("%w: end date before start date", ErrInvalidInput)
	}
	days := daySpan(in.StartDate, in.EndDate)
	if days > MaxTripDays {
		return fmt.Errorf("%w: trip too long (%d days, max %d)", ErrInvalidInput, days, MaxTripDays)
	}
	if strings.TrimSpace(in.BaseCurrency) == "" {
		return fmt.Errorf("%w: base currency required", ErrInvalidInput)
	}
	return nil
}

// stripFence removes a leading/trailing markdown code fence (```json ... ```)
// if the model wrapped its JSON despite instructions.
func stripFence(s string) string {
	s = strings.TrimSpace(s)
	if !strings.HasPrefix(s, "```") {
		return s
	}
	// Drop the first line (``` or ```json) and the trailing fence.
	if i := strings.IndexByte(s, '\n'); i >= 0 {
		s = s[i+1:]
	}
	s = strings.TrimSuffix(strings.TrimSpace(s), "```")
	return strings.TrimSpace(s)
}

// ParseAndValidate parses the raw LLM output, enforces the ok-guard, and
// validates the draft structure. Returns ErrInvalidPrompt when the model
// declined or the draft is unusable.
func ParseAndValidate(raw string, in GenerateInput) (*TripDraft, error) {
	cleaned := stripFence(raw)

	var resp llmResponse
	if err := json.Unmarshal([]byte(cleaned), &resp); err != nil {
		return nil, fmt.Errorf("autogen: parse llm response: %w", err)
	}

	if !resp.OK {
		reason := strings.TrimSpace(resp.Reason)
		if reason == "" {
			reason = "input tidak menjelaskan perjalanan yang valid"
		}
		return nil, fmt.Errorf("%w: %s", ErrInvalidPrompt, reason)
	}
	if resp.Trip == nil {
		return nil, fmt.Errorf("%w: model returned ok but no trip", ErrInvalidPrompt)
	}

	if err := validateDraft(resp.Trip, in); err != nil {
		return nil, err
	}
	return resp.Trip, nil
}

// validateDraft sanitizes and validates the generated trip against constraints.
// It mutates the draft in place (trims excess activities, fixes day count).
func validateDraft(d *TripDraft, in GenerateInput) error {
	if strings.TrimSpace(d.Title) == "" {
		d.Title = strings.TrimSpace(in.Destination)
	}
	if strings.TrimSpace(d.Destination) == "" {
		d.Destination = strings.TrimSpace(in.Destination)
	}
	if d.TotalDays == 0 {
		d.TotalDays = daySpan(in.StartDate, in.EndDate)
	}
	if strings.TrimSpace(d.TravelStyle) == "" {
		d.TravelStyle = "seimbang antara wisata, kuliner, dan relaksasi"
	}
	if strings.TrimSpace(d.Summary) == "" {
		d.Summary = fmt.Sprintf("Perjalanan %d hari ke %s", d.TotalDays, d.Destination)
	}
	if d.BaseCurrency == "" {
		d.BaseCurrency = in.BaseCurrency
	}
	if d.Budget < 0 {
		d.Budget = 0
	}
	if d.Tips == nil {
		d.Tips = []string{}
	}

	expectedDays := daySpan(in.StartDate, in.EndDate)
	if len(d.Days) == 0 {
		return fmt.Errorf("%w: no days generated", ErrInvalidPrompt)
	}
	// Trim to expected day count if the model over-generated.
	if len(d.Days) > expectedDays {
		d.Days = d.Days[:expectedDays]
	}

	for i := range d.Days {
		day := &d.Days[i]
		day.DayNumber = i + 1
		day.Date = in.StartDate.AddDate(0, 0, i).Format("2006-01-02")

		// Cap and sanitize activities.
		if len(day.Activities) > MaxActivitiesPerDay {
			day.Activities = day.Activities[:MaxActivitiesPerDay]
		}
		valid := day.Activities[:0]
		for _, a := range day.Activities {
			if a.Type != "location" && a.Type != "note" {
				continue // skip unsupported types
			}
			if strings.TrimSpace(a.Title) == "" {
				continue
			}
			if a.Type == "location" && strings.TrimSpace(a.LocationName) == "" {
				// Fall back to title as the location name rather than dropping.
				a.LocationName = a.Title
			}
			// Drop any AI-provided coordinates and place data: the model hallucinates
			// lat/lng, address, and google_place_id, which produces wrong map pins
			// and incorrect location data. These fields are resolved later from
			// location_name via Google Places (frontend resolver). Keep null/empty
			// so the map falls back to name-based search instead of trusting bogus data.
			a.Lat = nil
			a.Lng = nil
			a.Address = ""
			a.GooglePlaceID = ""
			// Sanitize category
			if a.Type == "location" {
				a.Category = sanitizeCategory(a.Category)
			}
			valid = append(valid, a)
		}
		day.Activities = valid
	}

	// Log locations that appear unrelated to the destination (soft check —
	// doesn't reject, just gives ops visibility into hallucination frequency).
	logSuspiciousLocations(d, in.Destination)

	return nil
}

// logSuspiciousLocations performs a soft check: for each location-type activity,
// it verifies whether the location_name contains at least one word from the
// intended destination. Locations that don't match are logged as warnings so
// operators can monitor LLM hallucination frequency without breaking the UX.
func logSuspiciousLocations(d *TripDraft, destination string) {
	if destination == "" {
		return
	}
	destLower := strings.ToLower(destination)
	// Remove common punctuation so "Tokyo, Japan" → "tokyo japan".
	destLower = strings.NewReplacer(",", "", ".", "", ";", "", ":", "").Replace(destLower)
	// Split destination into tokens (words) for fuzzy matching.
	destWords := strings.Fields(destLower)

	for i := range d.Days {
		for _, a := range d.Days[i].Activities {
			if a.Type != "location" {
				continue
			}
			locLower := strings.ToLower(a.LocationName)
			// Check if any destination word appears in the location name.
			matched := false
			for _, w := range destWords {
				// Skip very short words (<3 chars) to avoid false positives
				// (e.g. "di", "ke", "in", "to").
				if len(w) >= 3 && strings.Contains(locLower, w) {
					matched = true
					break
				}
			}
			if !matched {
				slog.Warn("autogen: SUSPICIOUS location",
					"location_name", a.LocationName,
					"destination", destination,
					"day", d.Days[i].DayNumber)
			}
		}
	}
}

// validCategories lists the allowed category values.
var validCategories = map[string]bool{
	"kuliner":      true,
	"wisata alam":  true,
	"budaya":       true,
	"belanja":      true,
	"transportasi": true,
	"akomodasi":    true,
}

// sanitizeCategory returns the category if valid, otherwise defaults to "kuliner".
func sanitizeCategory(c string) string {
	c = strings.TrimSpace(strings.ToLower(c))
	if validCategories[c] {
		return c
	}
	return "kuliner" // default fallback
}
