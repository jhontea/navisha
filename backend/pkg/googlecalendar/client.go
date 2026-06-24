// Package googlecalendar is a thin wrapper over the Google Calendar REST API.
//
// We deliberately avoid the official google.golang.org/api/calendar/v3 SDK to
// keep the dependency/vendor tree small — we only need to create and delete
// events. The oauth2 config's Client() handles access-token auto-refresh from
// the stored refresh token, the same pattern used by user.fetchGoogleUserInfo.
package googlecalendar

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"

	gooauth2 "golang.org/x/oauth2"
)

const baseURL = "https://www.googleapis.com/calendar/v3"

// ErrReauthRequired indicates the user's Google authorization is missing,
// expired, or revoked and they must re-authorize (log in again).
var ErrReauthRequired = errors.New("google calendar: reauthorization required")

// EventDateTime mirrors the Google Calendar event date/time object. Use
// DateTime (RFC3339) for timed events, or Date (YYYY-MM-DD) for all-day events.
type EventDateTime struct {
	DateTime string `json:"dateTime,omitempty"`
	Date     string `json:"date,omitempty"`
	TimeZone string `json:"timeZone,omitempty"`
}

// Event is the minimal subset of a Google Calendar event we create.
type Event struct {
	Summary     string        `json:"summary"`
	Location    string        `json:"location,omitempty"`
	Description string        `json:"description,omitempty"`
	Start       EventDateTime `json:"start"`
	End         EventDateTime `json:"end"`
}

// Client creates/deletes events on behalf of a user via per-call OAuth tokens.
type Client struct {
	cfg *gooauth2.Config
}

func New(cfg *gooauth2.Config) *Client {
	return &Client{cfg: cfg}
}

// CreateEvent inserts an event into the given calendar and returns its ID.
func (c *Client) CreateEvent(ctx context.Context, token *gooauth2.Token, calendarID string, ev Event) (string, error) {
	if calendarID == "" {
		calendarID = "primary"
	}

	body, err := json.Marshal(ev)
	if err != nil {
		return "", fmt.Errorf("googlecalendar.CreateEvent: marshal: %w", err)
	}

	endpoint := fmt.Sprintf("%s/calendars/%s/events", baseURL, url.PathEscape(calendarID))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("googlecalendar.CreateEvent: new request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.cfg.Client(ctx, token).Do(req)
	if err != nil {
		return "", fmt.Errorf("googlecalendar.CreateEvent: do: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return "", ErrReauthRequired
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("googlecalendar.CreateEvent: status %d: %s", resp.StatusCode, string(b))
	}

	var out struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", fmt.Errorf("googlecalendar.CreateEvent: decode: %w", err)
	}
	return out.ID, nil
}

// DeleteEvent removes an event. A 404/410 (already gone) is treated as success
// so cleanup is idempotent.
func (c *Client) DeleteEvent(ctx context.Context, token *gooauth2.Token, calendarID, eventID string) error {
	if calendarID == "" {
		calendarID = "primary"
	}

	endpoint := fmt.Sprintf("%s/calendars/%s/events/%s", baseURL, url.PathEscape(calendarID), url.PathEscape(eventID))
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, endpoint, nil)
	if err != nil {
		return fmt.Errorf("googlecalendar.DeleteEvent: new request: %w", err)
	}

	resp, err := c.cfg.Client(ctx, token).Do(req)
	if err != nil {
		return fmt.Errorf("googlecalendar.DeleteEvent: do: %w", err)
	}
	defer resp.Body.Close()

	switch {
	case resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden:
		return ErrReauthRequired
	case resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusGone:
		return nil // already deleted — idempotent
	case resp.StatusCode < 200 || resp.StatusCode >= 300:
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("googlecalendar.DeleteEvent: status %d: %s", resp.StatusCode, string(b))
	}
	return nil
}
