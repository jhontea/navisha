// Command placeeval runs the same Indonesian place searches against several
// location providers and prints how often each one finds the right place in
// the right area, so a provider can be chosen with data instead of
// impressions.
//
//	go run ./cmd/placeeval                          # every provider with a key
//	go run ./cmd/placeeval -providers google,here -show 3 -out places.json
//
// Keys are read from backend/.env or the environment: GEOAPIFY_API_KEY,
// GOOGLE_MAPS_API_KEY, FOURSQUARE_API_KEY, MAPBOX_ACCESS_TOKEN,
// TOMTOM_API_KEY, HERE_API_KEY. Providers without a key are skipped.
// Nothing is saved; each query is one billable request per provider.
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"sort"
	"strings"
	"sync"
	"text/tabwriter"
	"time"

	"github.com/joho/godotenv"
)

type outcome struct {
	Provider string        `json:"provider"`
	QueryID  string        `json:"query_id"`
	Query    string        `json:"query"`
	Verdict  verdict       `json:"verdict"`
	Error    string        `json:"error,omitempty"`
	TruthKm  *float64      `json:"truth_km,omitempty"`
	Latency  time.Duration `json:"latency_ns"`
	Results  []place       `json:"results"`
}

func main() {
	only := flag.String("providers", "", "comma-separated providers to run (default: all with a key)")
	pick := flag.String("queries", "", "comma-separated query IDs to run (default: all)")
	show := flag.Int("show", 0, "print the top N results of every query")
	out := flag.String("out", "", "write every result as JSON to this file")
	flag.Parse()

	_ = godotenv.Load(".env")

	active := selectProviders(*only)
	if len(active) == 0 {
		fmt.Fprintln(os.Stderr, "no provider has a key; set one of:", envKeys())
		os.Exit(1)
	}
	qs := selectQueries(*pick)

	outcomes := run(active, qs)

	printMatrix(active, qs, outcomes)
	printSummary(active, outcomes)
	if *show > 0 {
		printDetails(active, qs, outcomes, *show)
	}
	if *out != "" {
		if err := writeJSON(*out, outcomes); err != nil {
			fmt.Fprintln(os.Stderr, "write:", err)
			os.Exit(1)
		}
		fmt.Println("\nwrote", *out)
	}
}

func selectProviders(only string) []provider {
	want := map[string]bool{}
	for _, n := range strings.Split(only, ",") {
		if n = strings.TrimSpace(n); n != "" {
			want[n] = true
		}
	}
	var active []provider
	for _, p := range providers {
		if len(want) > 0 && !want[p.Name] {
			continue
		}
		if providerKey(p) == "" {
			fmt.Printf("skip %-10s (no %s)\n", p.Name, p.EnvKey)
			continue
		}
		active = append(active, p)
	}
	return active
}

func selectQueries(pick string) []evalQuery {
	if strings.TrimSpace(pick) == "" {
		return queries
	}
	want := map[string]bool{}
	for _, id := range strings.Split(pick, ",") {
		want[strings.TrimSpace(id)] = true
	}
	var out []evalQuery
	for _, q := range queries {
		if want[q.ID] {
			out = append(out, q)
		}
	}
	return out
}

func envKeys() string {
	keys := make([]string, 0, len(providers))
	for _, p := range providers {
		keys = append(keys, p.EnvKey)
	}
	return strings.Join(keys, ", ")
}

// run queries every provider in parallel, each provider's queries one at a
// time so free tiers' rate limits are not hit.
func run(active []provider, qs []evalQuery) map[string]map[string]outcome {
	all := map[string]map[string]outcome{}
	var mu sync.Mutex
	var wg sync.WaitGroup
	for _, p := range active {
		wg.Add(1)
		go func(p provider) {
			defer wg.Done()
			key := providerKey(p)
			byQuery := map[string]outcome{}
			for _, q := range qs {
				ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
				start := time.Now()
				results, err := p.Search(ctx, key, q.Query, q.Bias)
				cancel()
				if len(results) > maxResults {
					results = results[:maxResults]
				}
				o := outcome{Provider: p.Name, QueryID: q.ID, Query: q.Query, Verdict: grade(q, results, err), Latency: time.Since(start), Results: results}
				if err != nil {
					o.Error = err.Error()
				}
				if q.Truth != nil && len(results) > 0 {
					km := distanceKm(q.Truth.Lat, q.Truth.Lng, results[0].Lat, results[0].Lng)
					o.TruthKm = &km
				}
				byQuery[q.ID] = o
			}
			mu.Lock()
			all[p.Name] = byQuery
			mu.Unlock()
		}(p)
	}
	wg.Wait()
	return all
}

var verdictMark = map[verdict]string{
	verdictOK: "✓", verdictWrongArea: "✗ far", verdictWrongName: "~ name", verdictNone: "– none", verdictError: "! error",
}

func printMatrix(active []provider, qs []evalQuery, all map[string]map[string]outcome) {
	fmt.Println("\nTop result per query (✓ right place in area · ~ other place in area · ✗ outside area · – nothing · ! error)")
	tw := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	header := []string{"query", "kind"}
	for _, p := range active {
		header = append(header, p.Name)
	}
	fmt.Fprintln(tw, strings.Join(header, "\t"))
	for _, q := range qs {
		kind := "place"
		if len(q.Category) > 0 {
			kind = "category"
		}
		row := []string{q.Query, kind}
		for _, p := range active {
			o := all[p.Name][q.ID]
			cell := verdictMark[o.Verdict]
			if o.TruthKm != nil {
				cell += fmt.Sprintf(" (%s)", formatKm(*o.TruthKm))
			}
			row = append(row, cell)
		}
		fmt.Fprintln(tw, strings.Join(row, "\t"))
	}
	tw.Flush()
}

func printSummary(active []provider, all map[string]map[string]outcome) {
	fmt.Println("\nSummary")
	tw := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(tw, "provider\tright\tother place\toutside\tnone\terror\tmedian latency")
	for _, p := range active {
		counts := map[verdict]int{}
		var lat []time.Duration
		for _, o := range all[p.Name] {
			counts[o.Verdict]++
			lat = append(lat, o.Latency)
		}
		sort.Slice(lat, func(i, j int) bool { return lat[i] < lat[j] })
		total := len(all[p.Name])
		fmt.Fprintf(tw, "%s\t%d/%d\t%d\t%d\t%d\t%d\t%s\n", p.Name, counts[verdictOK], total,
			counts[verdictWrongName], counts[verdictWrongArea], counts[verdictNone], counts[verdictError],
			lat[len(lat)/2].Round(time.Millisecond))
	}
	tw.Flush()

	for _, p := range active {
		for _, o := range all[p.Name] {
			if o.Error != "" {
				fmt.Printf("\n%s error (%s): %s\n", p.Name, o.QueryID, o.Error)
				break // one sample per provider is enough to diagnose a bad key
			}
		}
	}
}

func printDetails(active []provider, qs []evalQuery, all map[string]map[string]outcome, n int) {
	fmt.Println("\nResults")
	for _, q := range qs {
		fmt.Printf("\n## %s  [%s]\n", q.Query, q.ID)
		for _, p := range active {
			o := all[p.Name][q.ID]
			fmt.Printf("  %s %s\n", p.Name, verdictMark[o.Verdict])
			for i, r := range o.Results {
				if i >= n {
					break
				}
				fmt.Printf("    %d. %s — %s (%.2f km from area)\n", i+1, r.Name, truncate(r.Address, 70),
					distanceKm(q.Area.Lat, q.Area.Lng, r.Lat, r.Lng))
			}
		}
	}
}

func formatKm(km float64) string {
	if km < 1 {
		return fmt.Sprintf("%.0f m", km*1000)
	}
	return fmt.Sprintf("%.1f km", km)
}

func writeJSON(path string, all map[string]map[string]outcome) error {
	var flat []outcome
	for _, byQuery := range all {
		for _, o := range byQuery {
			flat = append(flat, o)
		}
	}
	sort.Slice(flat, func(i, j int) bool {
		if flat[i].QueryID != flat[j].QueryID {
			return flat[i].QueryID < flat[j].QueryID
		}
		return flat[i].Provider < flat[j].Provider
	})
	data, err := json.MarshalIndent(flat, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o600)
}
