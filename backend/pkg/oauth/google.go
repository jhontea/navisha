package oauth

import (
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

// GoogleUserInfo is the payload returned by Google's userinfo endpoint.
type GoogleUserInfo struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	Name     string `json:"name"`
	Picture  string `json:"picture"`
	Verified bool   `json:"verified_email"`
}

// CalendarEventsScope grants read/write access to the user's Google Calendar
// events. Required for F4 (Export to Google Calendar).
const CalendarEventsScope = "https://www.googleapis.com/auth/calendar.events"

func NewGoogleConfig(clientID, clientSecret, redirectURL string) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes:       []string{"openid", "email", "profile", CalendarEventsScope},
		Endpoint:     google.Endpoint,
	}
}
