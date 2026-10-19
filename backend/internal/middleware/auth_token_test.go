package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

// CSRF is skipped for Bearer requests, so a Bearer header must never fall
// back to the access_token cookie.
func TestTokenFromRequest_BearerWinsOverCookie(t *testing.T) {
	tests := []struct {
		name   string
		bearer string
		cookie string
		want   string
	}{
		{"bearer only", "from-header", "", "from-header"},
		{"cookie only", "", "from-cookie", "from-cookie"},
		{"both: bearer wins", "from-header", "from-cookie", "from-header"},
		{"neither", "", "", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/v1/trips", nil)
			if tt.bearer != "" {
				req.Header.Set(echo.HeaderAuthorization, "Bearer "+tt.bearer)
			}
			if tt.cookie != "" {
				req.AddCookie(&http.Cookie{Name: "access_token", Value: tt.cookie})
			}
			c := echo.New().NewContext(req, httptest.NewRecorder())
			if got := tokenFromRequest(c); got != tt.want {
				t.Errorf("tokenFromRequest = %q, want %q", got, tt.want)
			}
		})
	}
}
