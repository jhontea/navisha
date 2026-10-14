// Command autogeneval generates trip drafts for a fixed set of sample trips,
// looks their places up on the map, and prints quality numbers, so prompt or
// model changes can be compared with data instead of impressions.
//
//	go run ./cmd/autogeneval                      # all cases, 2 at a time
//	go run ./cmd/autogeneval -cases umrah,bandung -show 3 -out eval.json
//
// Nothing is saved and no user quota is used, but every case is one billed
// LLM call (plus Geoapify lookups) on the configured provider.
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"regexp"
	"strings"
	"sync"
	"text/tabwriter"
	"time"
	"unicode"

	"github.com/labstack/echo/v4"

	"github.com/ahmadhafizh/navisha/backend/config"
	"github.com/ahmadhafizh/navisha/backend/internal/autogen"
	"github.com/ahmadhafizh/navisha/backend/internal/location"
	"github.com/ahmadhafizh/navisha/backend/pkg/llm"
)

type evalCase struct {
	Name        string
	Destination string
	Description string
	Days        int
	Style       string
}

var cases = []evalCase{
	{"bandung", "Bandung", "kuliner, kopi, dan udara sejuk", 3, "foodie"},
	{"bali", "Bali", "pantai, pura, dan sunset", 3, "balanced"},
	{"tokyo", "Tokyo, Japan", "anime, kuil, dan kuliner", 4, "cultural"},
	{"umrah", "Makkah & Madinah", "umroh keluarga dengan anak", 4, "family"},
	{"seoul", "Seoul, South Korea", "belanja, kafe, dan jalan santai", 3, "relaxed"},
}

// Same banned list as the prompt (autogen/prompt.go).
var cliches = []string{"surga", "hidden gem", "permata tersembunyi", "wajib dikunjungi", "must-visit",
	"tak terlupakan", "memukau", "menakjubkan", "ikonik", "petualangan seru", "pengalaman tak ternilai"}

// A location named like a category or area instead of one place.
var genericName = regexp.MustCompile(`(?i)^(restoran|rumah makan|kafe|cafe|hotel|penginapan|taman|warung|toko|pasar|masjid)\b.*\b(di|area|dekat|sekitar|kawasan)\b|^(jalur|perjalanan|rute)\b`)

var sentenceEnd = regexp.MustCompile(`[.!?]+(\s|$)`)

var areaTypes = map[string]bool{"city": true, "county": true, "state": true, "country": true, "postcode": true, "suburb": true, "district": true}

type result struct {
	Case        string             `json:"case"`
	Seconds     float64            `json:"seconds"`
	Error       string             `json:"error,omitempty"`
	Days        int                `json:"days"`
	Places      int                `json:"places"`
	Notes       int                `json:"notes"`
	Pinned      int                `json:"pinned"`
	NameMatched int                `json:"name_matched"`
	Generic     []string           `json:"generic,omitempty"`
	Cliches     []string           `json:"cliches,omitempty"`
	AvgWords    float64            `json:"avg_note_words"`
	TwoPart     float64            `json:"two_sentence_share"`
	Draft       *autogen.TripDraft `json:"draft,omitempty"`
}

func main() {
	only := flag.String("cases", "", "comma-separated case names (default: all: bandung,bali,tokyo,umrah,seoul)")
	parallel := flag.Int("parallel", 2, "cases generated at the same time")
	show := flag.Int("show", 2, "sample place notes to print per case")
	out := flag.String("out", "", "write full results (with drafts) as JSON to this file")
	drafts := flag.String("drafts", "", "reuse the drafts in this -out file instead of generating (no LLM calls), to compare geocoding on the same places")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		fail(err)
	}
	client := llm.NewClient(cfg.EffectiveProvider(), cfg.ActiveAPIKey(), cfg.ActiveModel(), cfg.ActiveBaseURL()).
		WithTimeout(time.Duration(cfg.LLM.TimeoutSeconds) * time.Second)
	usecase := autogen.NewUsecase(client, nil, cfg.ActiveModel())
	locations := location.NewHandler(location.NewGeoapifyClient(cfg.Location.GeoapifyAPIKey, cfg.Location.GeoapifyBaseURL, 8*time.Second))

	selected := cases
	if *only != "" {
		selected = nil
		for _, name := range strings.Split(*only, ",") {
			for _, c := range cases {
				if c.Name == strings.TrimSpace(name) {
					selected = append(selected, c)
				}
			}
		}
	}
	if len(selected) == 0 {
		fail(fmt.Errorf("no matching cases"))
	}

	fmt.Fprintf(os.Stderr, "model %s, %d case(s), %d at a time\n", cfg.ActiveModel(), len(selected), *parallel)
	saved := map[string]*autogen.TripDraft{}
	if *drafts != "" {
		data, err := os.ReadFile(*drafts)
		if err != nil {
			fail(err)
		}
		var prev []result
		if err := json.Unmarshal(data, &prev); err != nil {
			fail(err)
		}
		for _, r := range prev {
			saved[r.Case] = r.Draft
		}
	}
	results := make([]result, len(selected))
	sem := make(chan struct{}, max(1, *parallel))
	var wg sync.WaitGroup
	for i, c := range selected {
		wg.Add(1)
		go func(i int, c evalCase) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			results[i] = run(usecase, locations, c, saved[c.Name], *drafts != "")
			fmt.Fprintf(os.Stderr, "  %s done in %.0fs\n", c.Name, results[i].Seconds)
		}(i, c)
	}
	wg.Wait()

	report(results, *show)
	if *out != "" {
		data, _ := json.MarshalIndent(results, "", "  ")
		if err := os.WriteFile(*out, data, 0o600); err != nil {
			fail(err)
		}
		fmt.Printf("\nfull results: %s\n", *out)
	}
}

func run(usecase *autogen.Usecase, locations *location.Handler, c evalCase, reuse *autogen.TripDraft, reusing bool) result {
	r := result{Case: c.Name}
	start := time.Date(2027, 3, 10, 0, 0, 0, 0, time.UTC)
	began := time.Now()
	draft, err := reuse, error(nil)
	if reusing && reuse == nil {
		err = fmt.Errorf("no saved draft for this case")
	} else if !reusing {
		draft, err = usecase.GenerateDraft(context.Background(), "eval", autogen.GenerateInput{
			Destination: c.Destination, Description: c.Description,
			StartDate: start, EndDate: start.AddDate(0, 0, c.Days-1),
			BaseCurrency: "IDR", TravelStyle: c.Style,
		})
	}
	r.Seconds = time.Since(began).Seconds()
	if err != nil {
		r.Error = err.Error()
		return r
	}
	r.Draft = draft
	r.Days = len(draft.Days)

	type place struct{ name, alt, city string }
	var places []place
	var words, twoPart int
	text := strings.ToLower(draft.Title + " " + draft.Summary)
	for _, d := range draft.Days {
		text += " " + strings.ToLower(d.Theme)
		for _, a := range d.Activities {
			text += " " + strings.ToLower(a.Title+" "+a.Notes)
			if a.Type != "location" {
				r.Notes++
				continue
			}
			name := a.PlaceQuery
			if name == "" {
				name = a.LocationName
			}
			places = append(places, place{name, a.LocationName, a.City})
			if genericName.MatchString(strings.TrimSpace(a.LocationName)) {
				r.Generic = append(r.Generic, a.LocationName)
			}
			words += len(strings.Fields(a.Notes))
			if sentences(a.Notes) >= 2 {
				twoPart++
			}
		}
	}
	r.Places = len(places)
	if r.Places > 0 {
		r.AvgWords = float64(words) / float64(r.Places)
		r.TwoPart = float64(twoPart) / float64(r.Places)
	}
	for _, c := range cliches {
		if strings.Contains(text, c) {
			r.Cliches = append(r.Cliches, c)
		}
	}

	// Look the places up exactly as the app does (POST /locations/resolve).
	items := make([]map[string]string, len(places))
	for i, p := range places {
		items[i] = map[string]string{"key": fmt.Sprint(i), "name": p.name, "alt_name": p.alt, "city": p.city}
	}
	body, _ := json.Marshal(map[string]any{"destination": c.Destination, "items": items})
	req := httptest.NewRequest(http.MethodPost, "/locations/resolve", strings.NewReader(string(body)))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	if err := locations.Resolve(echo.New().NewContext(req, rec)); err != nil {
		r.Error = "resolve: " + err.Error()
		return r
	}
	var resolved struct {
		Results map[string][]location.Suggestion `json:"results"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &resolved)
	for i, p := range places {
		found := resolved.Results[fmt.Sprint(i)]
		pinned, named := false, false
		for _, s := range found {
			if overlap(p.name, s.Name) >= 0.45 || overlap(p.alt, s.Name) >= 0.45 {
				named = true
			}
			if s.NearCity && !areaTypes[s.ResultType] {
				pinned = true
			}
		}
		if named {
			r.NameMatched++
			pinned = true
		}
		if pinned {
			r.Pinned++
		}
	}
	return r
}

func report(results []result, show int) {
	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', tabwriter.AlignRight)
	fmt.Fprintln(w, "case\tsecs\tdays\tplaces\tpinned\tname match\tgeneric\tcliches\tnote words\t2+ sentences\t")
	var totalPlaces, totalPinned, totalNamed int
	for _, r := range results {
		if r.Error != "" {
			fmt.Fprintf(w, "%s\t%.0f\tERROR: %s\t\t\t\t\t\t\t\t\n", r.Case, r.Seconds, r.Error)
			continue
		}
		totalPlaces += r.Places
		totalPinned += r.Pinned
		totalNamed += r.NameMatched
		fmt.Fprintf(w, "%s\t%.0f\t%d\t%d\t%s\t%s\t%d\t%d\t%.0f\t%.0f%%\t\n", r.Case, r.Seconds, r.Days, r.Places,
			pct(r.Pinned, r.Places), pct(r.NameMatched, r.Places), len(r.Generic), len(r.Cliches), r.AvgWords, r.TwoPart*100)
	}
	fmt.Fprintf(w, "TOTAL\t\t\t%d\t%s\t%s\t\t\t\t\t\n", totalPlaces, pct(totalPinned, totalPlaces), pct(totalNamed, totalPlaces))
	_ = w.Flush()

	for _, r := range results {
		if r.Draft == nil {
			continue
		}
		fmt.Printf("\n== %s: %s\n   %s\n", r.Case, r.Draft.Title, r.Draft.Summary)
		themes := make([]string, 0, len(r.Draft.Days))
		for _, d := range r.Draft.Days {
			themes = append(themes, d.Theme)
		}
		fmt.Printf("   themes: %s\n", strings.Join(themes, " | "))
		if len(r.Generic) > 0 {
			fmt.Printf("   generic names: %s\n", strings.Join(r.Generic, "; "))
		}
		if len(r.Cliches) > 0 {
			fmt.Printf("   cliches: %s\n", strings.Join(r.Cliches, ", "))
		}
		n := 0
		for _, d := range r.Draft.Days {
			for _, a := range d.Activities {
				if a.Type == "location" && n < show {
					fmt.Printf("   - %s (%s, %s): %s\n", a.Title, a.PlaceQuery, a.City, a.Notes)
					n++
				}
			}
		}
	}
}

func pct(n, of int) string {
	if of == 0 {
		return "-"
	}
	return fmt.Sprintf("%.0f%%", float64(n)*100/float64(of))
}

// overlap is the share of distinct name words two names have in common
// (Jaccard), close to the app's place matching.
func overlap(a, b string) float64 {
	ta, tb := words(a), words(b)
	if len(ta) == 0 || len(tb) == 0 {
		return 0
	}
	union := map[string]bool{}
	common := 0
	for w := range ta {
		union[w] = true
		if tb[w] {
			common++
		}
	}
	for w := range tb {
		union[w] = true
	}
	return float64(common) / float64(len(union))
}

func words(s string) map[string]bool {
	out := map[string]bool{}
	for _, f := range strings.FieldsFunc(strings.ToLower(s), func(r rune) bool { return !unicode.IsLetter(r) && !unicode.IsDigit(r) }) {
		if len([]rune(f)) > 1 {
			out[f] = true
		}
	}
	return out
}

func sentences(s string) int {
	n := 0
	for _, part := range sentenceEnd.Split(strings.TrimSpace(s), -1) {
		if strings.TrimSpace(part) != "" {
			n++
		}
	}
	return n
}

func fail(err error) {
	fmt.Fprintln(os.Stderr, "autogeneval:", err)
	os.Exit(1)
}
