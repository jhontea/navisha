package summary

import (
	"context"
	"errors"
	"time"
)

var ErrNotFound = errors.New("summary not found")

type Repository interface {
	// Save upserts the summary for a trip (one row per trip, ON CONFLICT(trip_id)).
	Save(ctx context.Context, tripID, content, model string, sourceUpdatedAt time.Time) (*Summary, error)
	// GetByTripID returns the stored summary or ErrNotFound.
	GetByTripID(ctx context.Context, tripID string) (*Summary, error)
	// Delete removes the summary for a trip. No error if absent.
	Delete(ctx context.Context, tripID string) error
	// VerifyTripOwner checks that the given user ID owns the trip.
	// Returns ErrForbidden if not found or not owned.
	VerifyTripOwner(ctx context.Context, userID, tripID string) error
}
