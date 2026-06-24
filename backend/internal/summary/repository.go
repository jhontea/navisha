package summary

import "errors"

var ErrNotFound = errors.New("summary not found")

type Repository interface {
	// Save upserts the summary for a trip (one row per trip, ON CONFLICT(trip_id)).
	Save(tripID, content, model string) (*Summary, error)
	// GetByTripID returns the stored summary or ErrNotFound.
	GetByTripID(tripID string) (*Summary, error)
	// Delete removes the summary for a trip. No error if absent.
	Delete(tripID string) error
}
