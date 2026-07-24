package tripshare

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type postgresRepository struct{ db *pgxpool.Pool }

func NewPostgresRepository(db *pgxpool.Pool) Repository { return &postgresRepository{db: db} }

func (r *postgresRepository) Create(ctx context.Context, tripID, userID string, expiresAt time.Time) (*Link, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("tripshare.Create begin: %w", err)
	}
	defer tx.Rollback(ctx)
	var owner string
	if err := tx.QueryRow(ctx, `SELECT user_id FROM trips WHERE id=$1 FOR UPDATE`, tripID).Scan(&owner); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("tripshare.Create owner: %w", err)
	}
	if owner != userID {
		return nil, ErrNotFound
	}
	if _, err := tx.Exec(ctx, `UPDATE trip_share_links SET revoked_at=NOW() WHERE trip_id=$1 AND revoked_at IS NULL`, tripID); err != nil {
		return nil, fmt.Errorf("tripshare.Create revoke: %w", err)
	}
	link := &Link{}
	err = tx.QueryRow(ctx, `INSERT INTO trip_share_links (trip_id, created_by, expires_at)
		VALUES ($1,$2,$3) RETURNING id,trip_id,created_by,expires_at,revoked_at,created_at`, tripID, userID, expiresAt).
		Scan(&link.ID, &link.TripID, &link.CreatedBy, &link.ExpiresAt, &link.RevokedAt, &link.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("tripshare.Create insert: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("tripshare.Create commit: %w", err)
	}
	return link, nil
}

func (r *postgresRepository) FindActive(ctx context.Context, tripID, userID string) (*Link, error) {
	link := &Link{}
	err := r.db.QueryRow(ctx, `SELECT s.id,s.trip_id,s.created_by,s.expires_at,s.revoked_at,s.created_at
		FROM trip_share_links s JOIN trips t ON t.id=s.trip_id
		WHERE s.trip_id=$1 AND t.user_id=$2 AND s.revoked_at IS NULL AND s.expires_at>NOW()`, tripID, userID).
		Scan(&link.ID, &link.TripID, &link.CreatedBy, &link.ExpiresAt, &link.RevokedAt, &link.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("tripshare.FindActive: %w", err)
	}
	return link, nil
}

func (r *postgresRepository) Revoke(ctx context.Context, tripID, userID string) error {
	cmd, err := r.db.Exec(ctx, `UPDATE trip_share_links s SET revoked_at=NOW() FROM trips t
		WHERE s.trip_id=t.id AND s.trip_id=$1 AND t.user_id=$2 AND s.revoked_at IS NULL`, tripID, userID)
	if err != nil {
		return fmt.Errorf("tripshare.Revoke: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *postgresRepository) Resolve(ctx context.Context, linkID string) (*PublicItinerary, error) {
	var out PublicItinerary
	var tripID string
	var expired, revoked bool
	err := r.db.QueryRow(ctx, `SELECT t.id,t.title,t.description,t.start_date::text,t.end_date::text,t.cover_image_url,
		s.expires_at,s.expires_at<=NOW(),s.revoked_at IS NOT NULL FROM trip_share_links s
		JOIN trips t ON t.id=s.trip_id WHERE s.id=$1`, linkID).
		Scan(&tripID, &out.Title, &out.Description, &out.StartDate, &out.EndDate, &out.CoverImageURL, &out.ExpiresAt, &expired, &revoked)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("tripshare.Resolve trip: %w", err)
	}
	if expired || revoked {
		return nil, ErrExpired
	}
	rows, err := r.db.Query(ctx, `SELECT d.id,d.date::text,d.day_number,d.title,a.id,a.title,a.start_time,a.end_time,a.payload
		FROM trip_share_links s JOIN days d ON d.trip_id=s.trip_id
		LEFT JOIN activities a ON a.day_id=d.id AND a.type='location'
		WHERE s.id=$1 ORDER BY d.day_number,a.order_index,a.created_at`, linkID)
	if err != nil {
		return nil, fmt.Errorf("tripshare.Resolve days: %w", err)
	}
	defer rows.Close()
	byDay := map[string]int{}
	for rows.Next() {
		var day PublicDay
		var aid, title, start, end *string
		var payload []byte
		if err := rows.Scan(&day.ID, &day.Date, &day.DayNumber, &day.Title, &aid, &title, &start, &end, &payload); err != nil {
			return nil, fmt.Errorf("tripshare.Resolve scan: %w", err)
		}
		idx, ok := byDay[day.ID]
		if !ok {
			day.Activities = []PublicActivity{}
			out.Days = append(out.Days, day)
			idx = len(out.Days) - 1
			byDay[day.ID] = idx
		}
		if aid != nil {
			out.Days[idx].Activities = append(out.Days[idx].Activities, PublicActivity{ID: *aid, Title: *title, StartTime: *start, EndTime: *end, Payload: sanitizeLocationPayload(payload)})
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("tripshare.Resolve rows: %w", err)
	}
	if err := r.loadPublicTransportations(ctx, tripID, &out); err != nil {
		return nil, err
	}
	if err := r.loadPublicAccommodations(ctx, tripID, &out); err != nil {
		return nil, err
	}
	_, _ = r.db.Exec(ctx, `UPDATE trip_share_links SET last_accessed_at=NOW() WHERE id=$1`, linkID)
	return &out, nil
}

func (r *postgresRepository) loadPublicTransportations(ctx context.Context, tripID string, out *PublicItinerary) error {
	rows, err := r.db.Query(ctx, `SELECT id,type,label,operator,from_location,to_location,departure_datetime,arrival_datetime
		FROM transportations WHERE trip_id=$1 ORDER BY COALESCE(departure_datetime,created_at),created_at`, tripID)
	if err != nil {
		return fmt.Errorf("tripshare.loadPublicTransportations: %w", err)
	}
	defer rows.Close()
	out.Transportations = []PublicTransportation{}
	for rows.Next() {
		var item PublicTransportation
		if err := rows.Scan(&item.ID, &item.Type, &item.Label, &item.Operator, &item.FromLocation, &item.ToLocation, &item.DepartureDatetime, &item.ArrivalDatetime); err != nil {
			return fmt.Errorf("tripshare.loadPublicTransportations scan: %w", err)
		}
		out.Transportations = append(out.Transportations, item)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("tripshare.loadPublicTransportations rows: %w", err)
	}
	return nil
}

func (r *postgresRepository) loadPublicAccommodations(ctx context.Context, tripID string, out *PublicItinerary) error {
	rows, err := r.db.Query(ctx, `SELECT id,accommodation_type,name,location_name,check_in::text,check_out::text
		FROM accommodations WHERE trip_id=$1 ORDER BY check_in,created_at`, tripID)
	if err != nil {
		return fmt.Errorf("tripshare.loadPublicAccommodations: %w", err)
	}
	defer rows.Close()
	out.Accommodations = []PublicAccommodation{}
	for rows.Next() {
		var item PublicAccommodation
		if err := rows.Scan(&item.ID, &item.AccommodationType, &item.Name, &item.LocationName, &item.CheckIn, &item.CheckOut); err != nil {
			return fmt.Errorf("tripshare.loadPublicAccommodations scan: %w", err)
		}
		out.Accommodations = append(out.Accommodations, item)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("tripshare.loadPublicAccommodations rows: %w", err)
	}
	return nil
}

func sanitizeLocationPayload(raw []byte) json.RawMessage {
	var src map[string]any
	if json.Unmarshal(raw, &src) != nil {
		return json.RawMessage(`{}`)
	}
	allowed := map[string]any{}
	for _, key := range []string{"location_name", "address", "lat", "lng", "external_url", "image_urls"} {
		if v, ok := src[key]; ok {
			allowed[key] = v
		}
	}
	b, _ := json.Marshal(allowed)
	return b
}
