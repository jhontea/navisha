package tripshare

import (
	"encoding/json"
	"time"
)

type Link struct {
	ID        string
	TripID    string
	CreatedBy string
	ExpiresAt time.Time
	RevokedAt *time.Time
	CreatedAt time.Time
}

type PublicActivity struct {
	ID        string          `json:"id"`
	Title     string          `json:"title"`
	StartTime string          `json:"start_time"`
	EndTime   string          `json:"end_time"`
	Payload   json.RawMessage `json:"payload"`
}

type PublicDay struct {
	ID         string           `json:"id"`
	Date       string           `json:"date"`
	DayNumber  int              `json:"day_number"`
	Title      string           `json:"title"`
	Activities []PublicActivity `json:"activities"`
}

type PublicItinerary struct {
	Title         string      `json:"title"`
	Description   string      `json:"description"`
	StartDate     string      `json:"start_date"`
	EndDate       string      `json:"end_date"`
	CoverImageURL string      `json:"cover_image_url"`
	ExpiresAt     time.Time   `json:"expires_at"`
	Days          []PublicDay `json:"days"`
}
