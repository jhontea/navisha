// Package middleware provides HTTP middleware for the Navisha API.
// Loop 2: API version header middleware.
package middleware

import "github.com/labstack/echo/v4"

const APIVersion = "1.0.0"

// APIVersionHeader adds X-API-Version header to all responses.
func APIVersionHeader() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			c.Response().Header().Set("X-API-Version", APIVersion)
			return next(c)
		}
	}
}
