package integration

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"time"

	"github.com/ahmadhafizh/navisha/backend/internal/apperr"
	"github.com/ahmadhafizh/navisha/backend/internal/middleware"
	"github.com/ahmadhafizh/navisha/backend/internal/trip"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
)

// TripOverviewStats is a deliberately small read model. The overview UI only
// needs counts and budget totals, not every activity/stay/transport payload.
type TripOverviewStats struct {
	ActivityCountByDay  map[string]int
	AccommodationCount  int
	TransportationCount int
	ExpenseTotal        float64
	ExpenseByCategory   map[string]float64
}

type TripOverviewReader interface {
	Stats(ctx context.Context, tripID string) (*TripOverviewStats, error)
}

type PostgresTripOverviewReader struct {
	db *pgxpool.Pool
}

func NewPostgresTripOverviewReader(db *pgxpool.Pool) *PostgresTripOverviewReader {
	return &PostgresTripOverviewReader{db: db}
}

// Stats retrieves every overview aggregate in one database round trip. Trip
// ownership is checked once by trip.Usecase.Get before this method is called.
func (r *PostgresTripOverviewReader) Stats(ctx context.Context, tripID string) (*TripOverviewStats, error) {
	const query = `
		WITH activity_counts AS (
			SELECT d.id AS day_id, COUNT(a.id)::int AS activity_count
			FROM days d
			LEFT JOIN activities a ON a.day_id = d.id
			WHERE d.trip_id = $1
			GROUP BY d.id
		), category_totals AS (
			SELECT category, COALESCE(SUM(converted_amount), 0)::float8 AS total
			FROM expenses
			WHERE trip_id = $1
			GROUP BY category
		)
		SELECT
			(SELECT COUNT(*)::int FROM accommodations WHERE trip_id = $1),
			(SELECT COUNT(*)::int FROM transportations WHERE trip_id = $1),
			COALESCE((SELECT jsonb_object_agg(day_id, activity_count) FROM activity_counts), '{}'::jsonb),
			COALESCE((SELECT SUM(converted_amount)::float8 FROM expenses WHERE trip_id = $1), 0),
			COALESCE((SELECT jsonb_object_agg(category, total) FROM category_totals), '{}'::jsonb)`

	var activityJSON []byte
	var categoryJSON []byte
	stats := &TripOverviewStats{}
	if err := r.db.QueryRow(ctx, query, tripID).Scan(
		&stats.AccommodationCount,
		&stats.TransportationCount,
		&activityJSON,
		&stats.ExpenseTotal,
		&categoryJSON,
	); err != nil {
		return nil, fmt.Errorf("trip overview stats: %w", err)
	}
	if err := json.Unmarshal(activityJSON, &stats.ActivityCountByDay); err != nil {
		return nil, fmt.Errorf("trip overview activity counts: %w", err)
	}
	if err := json.Unmarshal(categoryJSON, &stats.ExpenseByCategory); err != nil {
		return nil, fmt.Errorf("trip overview expense categories: %w", err)
	}
	return stats, nil
}

type TripOverviewHandler struct {
	trips  trip.UsecaseInterface
	reader TripOverviewReader
}

func NewTripOverviewHandler(trips trip.UsecaseInterface, reader TripOverviewReader) *TripOverviewHandler {
	return &TripOverviewHandler{trips: trips, reader: reader}
}

func (h *TripOverviewHandler) RegisterRoutes(g *echo.Group, authMiddleware echo.MiddlewareFunc) {
	g.GET("/trips/:trip_id/overview", h.Get, authMiddleware)
}

func (h *TripOverviewHandler) Get(c echo.Context) error {
	userID, ok := c.Get(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "missing user context")
	}

	ctx := c.Request().Context()
	tripID := c.Param("trip_id")
	tripStarted := time.Now()
	t, days, err := h.trips.Get(ctx, userID, tripID)
	if err != nil {
		return mapTripOverviewError(err)
	}
	tripDuration := time.Since(tripStarted)

	overviewStarted := time.Now()
	stats, err := h.reader.Stats(ctx, tripID)
	if err != nil {
		return mapTripOverviewError(err)
	}
	overviewDuration := time.Since(overviewStarted)
	c.Response().Header().Set("Server-Timing", fmt.Sprintf(
		"trip;dur=%.2f, overview;dur=%.2f",
		float64(tripDuration.Microseconds())/1000,
		float64(overviewDuration.Microseconds())/1000,
	))

	categories := make([]string, 0, len(stats.ExpenseByCategory))
	for category := range stats.ExpenseByCategory {
		categories = append(categories, category)
	}
	sort.Strings(categories)
	byCategory := make([]map[string]any, 0, len(categories))
	for _, category := range categories {
		total := stats.ExpenseByCategory[category]
		byCategory = append(byCategory, map[string]any{"category": category, "total": total})
	}

	response := map[string]any{
		"trip":                  tripOverviewTripResponse(t, days),
		"activity_count_by_day": stats.ActivityCountByDay,
		"accommodation_count":   stats.AccommodationCount,
		"transportation_count":  stats.TransportationCount,
		"expense_summary": map[string]any{
			"total_base": stats.ExpenseTotal, "base_currency": t.BaseCurrency, "by_category": byCategory,
		},
	}
	return privateJSONWithETag(c, response)
}

func privateJSONWithETag(c echo.Context, response any) error {
	body, err := json.Marshal(response)
	if err != nil {
		return fmt.Errorf("trip overview encode: %w", err)
	}
	sum := sha256.Sum256(body)
	etag := fmt.Sprintf("\"%x\"", sum[:12])
	c.Response().Header().Set("Cache-Control", "private, no-cache, must-revalidate")
	c.Response().Header().Del("Pragma")
	c.Response().Header().Set("ETag", etag)
	if c.Request().Header.Get("If-None-Match") == etag {
		return c.NoContent(http.StatusNotModified)
	}
	return c.Blob(http.StatusOK, "application/json; charset=UTF-8", body)
}

func tripOverviewTripResponse(t *trip.Trip, days []trip.Day) map[string]any {
	dayItems := make([]map[string]any, 0, len(days))
	for i := range days {
		dayItems = append(dayItems, map[string]any{
			"id": days[i].ID, "trip_id": days[i].TripID,
			"date": days[i].Date.Format("2006-01-02"), "day_number": days[i].DayNumber,
			"title": days[i].Title, "notes": days[i].Notes,
		})
	}
	return map[string]any{
		"id": t.ID, "user_id": t.UserID, "title": t.Title, "description": t.Description,
		"start_date": t.StartDate.Format("2006-01-02"), "end_date": t.EndDate.Format("2006-01-02"),
		"base_currency": t.BaseCurrency, "budget": t.Budget, "budget_categories": t.BudgetCategories,
		"cover_image_url": t.CoverImageURL, "notes": t.Notes,
		"created_at": t.CreatedAt, "updated_at": t.UpdatedAt, "days": dayItems,
	}
}

func mapTripOverviewError(err error) error {
	return apperr.MapHTTP(err,
		apperr.HTTPMapping{Err: trip.ErrNotFound, Code: http.StatusNotFound, Message: "trip not found"},
		apperr.HTTPMapping{Err: apperr.ErrForbidden, Code: http.StatusForbidden, Message: "forbidden"},
	)
}
