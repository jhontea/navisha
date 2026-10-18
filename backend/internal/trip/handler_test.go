package trip

import (
	"errors"
	"fmt"
	"net/http"
	"testing"

	"github.com/jhontea/navisha/backend/internal/apperr"
	"github.com/labstack/echo/v4"
)

func TestMapErr_RatesUnavailableIs503(t *testing.T) {
	wrapped := fmt.Errorf("trip.usecase.Update: rebase expenses: %w: %w", apperr.ErrRatesUnavailable, errors.New("upstream timeout"))

	var he *echo.HTTPError
	if !errors.As(mapErr(wrapped), &he) {
		t.Fatalf("mapErr did not return *echo.HTTPError")
	}
	if he.Code != http.StatusServiceUnavailable {
		t.Errorf("code = %d, want 503", he.Code)
	}
}
