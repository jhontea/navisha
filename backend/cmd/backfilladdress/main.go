// Command backfilladdress replaces location activities' addresses that are
// raw coordinates ("-6.117791, 106.858039") with a reverse-geocoded address.
// They were saved from pasted Google Maps links while reverse geocoding
// called a non-existent Geoapify endpoint (fixed in PR #63).
//
//	go run ./cmd/backfilladdress          # dry run: print old → new, write nothing
//	go run ./cmd/backfilladdress -apply   # write the new addresses in one transaction
//
// Only payload.address changes; titles, place names and coordinates are left
// alone. An activity whose lookup fails keeps its address. It never runs
// migrations.
package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"regexp"
	"time"

	"github.com/ahmadhafizh/navisha/backend/config"
	"github.com/ahmadhafizh/navisha/backend/internal/location"
	"github.com/jackc/pgx/v5/pgxpool"
)

// coordPattern matches an address that is only "lat, lng".
var coordPattern = regexp.MustCompile(`^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$`)

type activity struct {
	ID, Title, Address string
	Lat, Lng           float64
}

type update struct {
	activity
	NewAddress string
}

// reverser is location.GeoapifyClient's ReverseGeocode.
type reverser interface {
	ReverseGeocode(ctx context.Context, lat, lng float64) (address, countryCode string, ok bool)
}

// plan looks up an address for every activity whose address is coordinates.
// Activities with a real address, or whose lookup fails, are skipped.
func plan(ctx context.Context, geo reverser, items []activity) (updates []update, skipped []activity) {
	for _, a := range items {
		if !coordPattern.MatchString(a.Address) {
			continue
		}
		addr, _, ok := geo.ReverseGeocode(ctx, a.Lat, a.Lng)
		if !ok || addr == "" || coordPattern.MatchString(addr) {
			skipped = append(skipped, a)
			continue
		}
		updates = append(updates, update{activity: a, NewAddress: addr})
	}
	return updates, skipped
}

func main() {
	apply := flag.Bool("apply", false, "write the new addresses (default: dry run)")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		fail(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	db, err := pgxpool.New(ctx, cfg.DB.URL)
	if err != nil {
		fail(err)
	}
	defer db.Close()

	rows, err := db.Query(ctx,
		`SELECT id, title, payload->>'address', (payload->>'lat')::float8, (payload->>'lng')::float8
		   FROM activities
		  WHERE type = 'location'
		    AND payload->>'address' ~ $1
		    AND payload->>'lat' IS NOT NULL AND payload->>'lng' IS NOT NULL
		  ORDER BY created_at`, coordPattern.String())
	if err != nil {
		fail(fmt.Errorf("list activities: %w", err))
	}
	var items []activity
	for rows.Next() {
		var a activity
		if err := rows.Scan(&a.ID, &a.Title, &a.Address, &a.Lat, &a.Lng); err != nil {
			fail(fmt.Errorf("scan: %w", err))
		}
		items = append(items, a)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		fail(err)
	}

	geo := location.NewGeoapifyClient(cfg.Location.GeoapifyAPIKey, cfg.Location.GeoapifyBaseURL,
		time.Duration(cfg.Location.GeoapifyTimeoutSecs)*time.Second)
	updates, skipped := plan(ctx, geo, items)

	for _, u := range updates {
		fmt.Printf("%s  %s\n    %s\n  → %s\n", u.ID, u.Title, u.Address, u.NewAddress)
	}
	for _, a := range skipped {
		fmt.Printf("%s  %s\n    %s\n  ✗ no address found, left as is\n", a.ID, a.Title, a.Address)
	}
	fmt.Printf("\n%d with coordinates, %d to update, %d skipped\n", len(items), len(updates), len(skipped))

	if !*apply {
		fmt.Println("dry run: nothing written (pass -apply to write)")
		return
	}
	tx, err := db.Begin(ctx)
	if err != nil {
		fail(err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck // no-op after commit
	for _, u := range updates {
		// Guarded on the old address, so an edit made meanwhile is kept.
		if _, err := tx.Exec(ctx,
			`UPDATE activities
			    SET payload = jsonb_set(payload, '{address}', to_jsonb($2::text)), updated_at = NOW()
			  WHERE id = $1 AND payload->>'address' = $3`,
			u.ID, u.NewAddress, u.Address); err != nil {
			fail(fmt.Errorf("update %s: %w", u.ID, err))
		}
	}
	if err := tx.Commit(ctx); err != nil {
		fail(err)
	}
	fmt.Printf("applied: %d addresses updated\n", len(updates))
}

func fail(err error) {
	fmt.Fprintln(os.Stderr, "backfilladdress:", err)
	os.Exit(1)
}
