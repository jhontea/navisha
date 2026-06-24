package integration

import (
	"context"
	"encoding/json"

	"github.com/ahmadhafizh/navisha/backend/internal/activity"
	"github.com/ahmadhafizh/navisha/backend/internal/calendarexport"
)

var _ calendarexport.DataProvider = (*TripContextProvider)(nil)

// GetCalendarItems returns the trip's location activities flattened for calendar
// export. trips.Get enforces ownership (apperr.ErrForbidden for non-owner).
// Only activities of type "location" with a non-empty location name are
// included; notes/todos and locationless rows are skipped.
func (p *TripContextProvider) GetCalendarItems(ctx context.Context, userID, tripID string) ([]calendarexport.CalendarItem, error) {
	_, days, err := p.trips.Get(userID, tripID)
	if err != nil {
		return nil, err
	}

	var items []calendarexport.CalendarItem
	for _, d := range days {
		acts, err := p.activities.List(userID, d.ID)
		if err != nil {
			return nil, err
		}
		for _, a := range acts {
			if a.Type != activity.TypeLocation || len(a.Payload) == 0 {
				continue
			}
			var lp activity.LocationPayload
			if err := json.Unmarshal(a.Payload, &lp); err != nil {
				continue
			}
			if lp.LocationName == "" {
				continue
			}
			items = append(items, calendarexport.CalendarItem{
				ActivityID:   a.ID,
				Title:        a.Title,
				LocationName: lp.LocationName,
				Address:      lp.Address,
				Date:         d.Date,
				StartTime:    a.StartTime,
				EndTime:      a.EndTime,
			})
		}
	}
	return items, nil
}
