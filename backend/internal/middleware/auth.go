package middleware

import (
	"net/http"
	"strings"

	"github.com/jhontea/navisha/backend/pkg/jwt"
	"github.com/labstack/echo/v4"
)

const UserIDKey = "user_id"

func Auth(jwtSvc *jwt.Service) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			token := tokenFromRequest(c)
			if token == "" {
				return echo.NewHTTPError(http.StatusUnauthorized, "missing token")
			}

			userID, err := jwtSvc.ValidateAccessToken(token)
			if err != nil {
				return echo.NewHTTPError(http.StatusUnauthorized, "invalid token")
			}

			c.Set(UserIDKey, userID)
			return next(c)
		}
	}
}

func tokenFromRequest(c echo.Context) string {
	cookie, err := c.Cookie("access_token")
	if err == nil && cookie.Value != "" {
		return cookie.Value
	}

	// Fallback: Authorization header (useful for API testing)
	bearer := c.Request().Header.Get("Authorization")
	if strings.HasPrefix(bearer, "Bearer ") {
		return strings.TrimPrefix(bearer, "Bearer ")
	}

	return ""
}

// WithUser adapts a handler that needs the signed-in user's ID. It reads the
// ID set by the auth middleware and answers 401 when it is missing, so
// handlers no longer repeat that check.
func WithUser(next func(c echo.Context, userID string) error) echo.HandlerFunc {
	return func(c echo.Context) error {
		userID, ok := c.Get(UserIDKey).(string)
		if !ok || userID == "" {
			return echo.NewHTTPError(http.StatusUnauthorized, "missing user context")
		}
		return next(c, userID)
	}
}
