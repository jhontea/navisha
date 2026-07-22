package integration

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/ahmadhafizh/navisha/backend/internal/activity"
	"github.com/ahmadhafizh/navisha/backend/internal/autogen"
	"github.com/ahmadhafizh/navisha/backend/internal/trip"
)

type AutogenDayContextProvider struct {
	trips      trip.UsecaseInterface
	activities activity.UsecaseInterface
}

func NewAutogenDayContextProvider(trips trip.UsecaseInterface, activities activity.UsecaseInterface) *AutogenDayContextProvider {
	return &AutogenDayContextProvider{trips: trips, activities: activities}
}

var _ autogen.DayContextProvider = (*AutogenDayContextProvider)(nil)

func (p *AutogenDayContextProvider) GetDayContext(ctx context.Context, userID, tripID, dayID string) (*autogen.DayContext, error) {
	t, days, err := p.trips.Get(userID, tripID)
	if err != nil {
		if errors.Is(err, trip.ErrNotFound) {
			return nil, autogen.ErrDayNotFound
		}
		return nil, err
	}

	var selected *trip.Day
	for i := range days {
		if days[i].ID == dayID {
			selected = &days[i]
			break
		}
	}
	if selected == nil {
		return nil, autogen.ErrDayNotFound
	}

	activities, err := p.activities.List(userID, dayID)
	if err != nil {
		return nil, err
	}
	destination := strings.TrimSpace(t.Description)
	if destination == "" {
		destination = t.Title
	}
	out := &autogen.DayContext{
		TripID: tripID, DayID: dayID, Destination: destination, TripTitle: t.Title,
		DayNumber: selected.DayNumber, Date: selected.Date.Format("2006-01-02"), DayTitle: selected.Title,
	}
	for _, item := range activities {
		anchor := autogen.DayActivityContext{Title: item.Title, StartTime: item.StartTime, EndTime: item.EndTime}
		if item.Type == activity.TypeLocation && len(item.Payload) > 0 {
			var payload activity.LocationPayload
			if json.Unmarshal(item.Payload, &payload) == nil {
				anchor.LocationName = payload.LocationName
			}
		}
		out.Existing = append(out.Existing, anchor)
	}
	return out, nil
}
