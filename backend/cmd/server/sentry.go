package main

import (
	"errors"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/getsentry/sentry-go"
	sentryecho "github.com/getsentry/sentry-go/echo"
	"github.com/labstack/echo/v4"

	"github.com/ahmadhafizh/navisha/backend/config"
	appMiddleware "github.com/ahmadhafizh/navisha/backend/internal/middleware"
)

// initSentry turns on error reporting when SENTRY_DSN is set; otherwise it
// is a no-op and returns false. Only errors are sent (no tracing), without
// request bodies, cookies or IP addresses.
func initSentry(cfg *config.Config) bool {
	if cfg.App.SentryDSN == "" {
		return false
	}
	err := sentry.Init(sentry.ClientOptions{
		Dsn:            cfg.App.SentryDSN,
		Environment:    cfg.App.Environment,
		Release:        os.Getenv("GIT_SHA"),
		SendDefaultPII: false,
		BeforeSend: func(event *sentry.Event, _ *sentry.EventHint) *sentry.Event {
			if event.Request != nil {
				event.Request.Cookies = ""
				event.Request.Data = ""
				delete(event.Request.Headers, "Cookie")
				delete(event.Request.Headers, "Authorization")
			}
			return event
		},
	})
	if err != nil {
		slog.Error("sentry init failed; error reporting is off", "error", err)
		return false
	}
	slog.Info("sentry error reporting enabled")
	return true
}

// flushSentry sends queued events before the process exits.
func flushSentry() {
	sentry.Flush(2 * time.Second)
}

// useSentry reports panics and 5xx responses. Call after echomw.Recover so a
// panic is captured here first, then re-panicked for Recover to answer 500.
func useSentry(e *echo.Echo) {
	e.Use(sentryecho.New(sentryecho.Options{Repanic: true}))
	e.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if hub := sentryecho.GetHubFromContext(c); hub != nil {
				if userID, _ := c.Get(appMiddleware.UserIDKey).(string); userID != "" {
					hub.Scope().SetUser(sentry.User{ID: userID})
				}
			}
			return next(c)
		}
	})

	defaultHandler := e.HTTPErrorHandler
	e.HTTPErrorHandler = func(err error, c echo.Context) {
		code := http.StatusInternalServerError
		cause := err
		var he *echo.HTTPError
		if errors.As(err, &he) {
			code = he.Code
			if he.Internal != nil {
				cause = he.Internal
			}
		}
		if code >= http.StatusInternalServerError {
			if hub := sentryecho.GetHubFromContext(c); hub != nil {
				hub.CaptureException(cause)
			}
		}
		defaultHandler(err, c)
	}
}
