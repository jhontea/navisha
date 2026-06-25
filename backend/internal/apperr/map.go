package apperr

import (
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"
)

// HTTPMapping maps a sentinel error to an HTTP status code and user-facing message.
// Use with MapHTTP in handler mapErr functions to keep error mapping DRY.
type HTTPMapping struct {
	Err     error
	Code    int
	Message string
}

// MapHTTP maps err to an Echo HTTPError using the provided mappings.
// Falls back to 500 "internal error" if no mapping matches.
//
// Usage in handler files:
//
//	func mapErr(err error) error {
//	    return apperr.MapHTTP(err,
//	        apperr.HTTPMapping{Err: ErrNotFound, Code: 404, Message: "not found"},
//	        apperr.HTTPMapping{Err: apperr.ErrForbidden, Code: 403, Message: "forbidden"},
//	    )
//	}
func MapHTTP(err error, mappings ...HTTPMapping) error {
	for _, m := range mappings {
		if errors.Is(err, m.Err) {
			return echo.NewHTTPError(m.Code, m.Message)
		}
	}
	return echo.NewHTTPError(http.StatusInternalServerError, "internal error")
}
