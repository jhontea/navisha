// Package integration wires cross-domain data assembly without violating the
// per-domain isolation rule: the individual domain packages never import each
// other, but this package may import all of them to build aggregate views.
package integration

import (
	"context"
	"encoding/json"

	"github.com/ahmadhafizh/navisha/backend/internal/accommodation"
	"github.com/ahmadhafizh/navisha/backend/internal/activity"
	"github.com/ahmadhafizh/navisha/backend/internal/expense"
	"github.com/ahmadhafizh/navisha/backend/internal/summary"
	"github.com/ahmadhafizh/navisha/backend/internal/transportation"
	"github.com/ahmadhafizh/navisha/backend/internal/trip"
)

// TripContextProvider implements summary.TripDataProvider by reading from the
// trip, activity, accommodation, transportation, and expense usecases.
type TripContextProvider struct {
	trips           trip.UsecaseInterface
	activities      activity.UsecaseInterface
	accommodations  accommodation.UsecaseInterface
	transportations transportation.UsecaseInterface
	expenses        expense.UsecaseInterface
}

func NewTripContextProvider(
	trips trip.UsecaseInterface,
	activities activity.UsecaseInterface,
	accommodations accommodation.UsecaseInterface,
	transportations transportation.UsecaseInterface,
	expenses expense.UsecaseInterface,
) *TripContextProvider {
	return &TripContextProvider{
		trips:           trips,
		activities:      activities,
		accommodations:  accommodations,
		transportations: transportations,
		expenses:        expenses,
	}
}

var _ summary.TripDataProvider = (*TripContextProvider)(nil)

// GetTripContext assembles the cross-domain snapshot. trip.Usecase.Get enforces
// ownership (returns apperr.ErrForbidden for a non-owner), which propagates up.
func (p *TripContextProvider) GetTripContext(ctx context.Context, userID, tripID string) (*summary.TripContext, error) {
	t, days, err := p.trips.Get(userID, tripID)
	if err != nil {
		return nil, err
	}

	totalDays := len(days)

	out := &summary.TripContext{
		TripID:       tripID,
		Title:        t.Title,
		Destination:  t.Description,
		StartDate:    t.StartDate,
		EndDate:      t.EndDate,
		TotalDays:    totalDays,
		BaseCurrency: t.BaseCurrency,
		Budget:       t.Budget,
	}

	// Days + activities — Phase 3D: batch-fetch all activities in one query
	// instead of N individual queries (one per day).
	dayIDs := make([]string, len(days))
	for i, d := range days {
		dayIDs[i] = d.ID
	}
	actsByDay, err := p.activities.ListByDayIDs(ctx, userID, dayIDs)
	if err != nil {
		return nil, err
	}

	for _, d := range days {
		dc := summary.DayContext{
			DayNumber: d.DayNumber,
			Date:      d.Date,
		}
		for _, a := range actsByDay[d.ID] {
			ac := summary.ActivityContext{
				Type:      string(a.Type),
				Title:     a.Title,
				StartTime: a.StartTime,
				EndTime:   a.EndTime,
			}
			if a.Type == activity.TypeLocation && len(a.Payload) > 0 {
				var lp activity.LocationPayload
				if err := json.Unmarshal(a.Payload, &lp); err == nil {
					ac.LocationName = lp.LocationName
				}
			}
			dc.Activities = append(dc.Activities, ac)
		}
		out.Days = append(out.Days, dc)
	}

	// Accommodations
	accs, err := p.accommodations.List(userID, tripID)
	if err != nil {
		return nil, err
	}
	for _, a := range accs {
		out.Accommodations = append(out.Accommodations, summary.AccommodationContext{
			Name:         a.Name,
			Type:         string(a.AccommodationType),
			LocationName: a.LocationName,
			CheckIn:      a.CheckIn,
			CheckOut:     a.CheckOut,
		})
	}

	// Transportations
	trans, err := p.transportations.List(userID, tripID)
	if err != nil {
		return nil, err
	}
	for _, tr := range trans {
		out.Transportations = append(out.Transportations, summary.TransportationContext{
			Type:              string(tr.Type),
			FromLocation:      tr.FromLocation,
			ToLocation:        tr.ToLocation,
			DepartureDatetime: tr.DepartureDatetime,
			ArrivalDatetime:   tr.ArrivalDatetime,
		})
	}

	// Expense summary
	exp, err := p.expenses.Summary(userID, tripID)
	if err != nil {
		return nil, err
	}
	if exp != nil {
		out.TotalSpent = exp.TotalBase
		for _, ct := range exp.ByCategory {
			out.ExpenseByCategory = append(out.ExpenseByCategory, summary.CategoryTotal{
				Category: string(ct.Category),
				Total:    ct.Total,
			})
		}
	}

	return out, nil
}
