package apperr

import "errors"

// Sentinel errors shared across domains.
// Domain-specific errors live in their own package (e.g. trip.ErrNotFound).
var (
	ErrNotFound     = errors.New("not found")
	ErrUnauthorized = errors.New("unauthorized")
	ErrForbidden    = errors.New("forbidden")
	ErrConflict     = errors.New("conflict")
)
