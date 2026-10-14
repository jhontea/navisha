package summary

import (
	"strings"
	"testing"
	"time"
)

// The curated tip pool is Indonesian (QRIS, Gojek, Alfamart...); a trip
// abroad must not receive it.
func TestBuildPrompt_IndonesianTipsOnlyForIndonesia(t *testing.T) {
	ctx := newTripContext() // Bali, Indonesia
	system, _ := BuildPrompt(*ctx)
	if !strings.Contains(system, "TIPS LOKAL INDONESIA") {
		t.Error("Bali trip should get Indonesian local tips")
	}

	ctx.Destination = "Tokyo, Japan"
	system, _ = BuildPrompt(*ctx)
	if strings.Contains(system, "TIPS LOKAL INDONESIA") {
		t.Error("Tokyo trip must not get Indonesian local tips")
	}
}

// Amounts reach the model in the currency's own precision, so it does not
// echo "Rp 68,340,303.69".
func TestBuildPrompt_FormatsMoneyPerCurrency(t *testing.T) {
	ctx := newTripContext()
	ctx.Budget = 65_000_000
	ctx.TotalSpent = 68_340_303.69
	ctx.ExpenseByCategory = []CategoryTotal{{Category: "food", Total: 1_234_567.4}}
	_, user := BuildPrompt(*ctx)

	for _, want := range []string{
		"Budget: 65,000,000 IDR",
		"Total Spent: 68,340,304 IDR",
		"Over budget by: 3,340,304 IDR",
		"food: 1,234,567 IDR",
	} {
		if !strings.Contains(user, want) {
			t.Errorf("user prompt missing %q\n---\n%s", want, user)
		}
	}
	if strings.Contains(user, ".69") || strings.Contains(user, ".00 IDR") {
		t.Errorf("IDR amounts must not have decimals\n---\n%s", user)
	}
}

func TestBuildPrompt_StorytellingVoice(t *testing.T) {
	system, _ := BuildPrompt(*newTripContext())
	for _, want := range []string{"Bercerita, bukan melapor", "## Gambaran besar", "## Sorotan per hari", "## Budget", "## Yang perlu disiapkan", "## Sekilas", "- [ ]", "350–550 kata", "SATU emoji yang relevan", "cakep abis", "hidden gem"} {
		if !strings.Contains(system, want) {
			t.Errorf("system prompt missing %q", want)
		}
	}
	if strings.Contains(system, "GUNAKAN EMOJI") {
		t.Error("system prompt still asks for emoji section headers")
	}
}

func TestTripStatus(t *testing.T) {
	ctx := *newTripContext()
	ctx.StartDate = time.Date(2026, 5, 10, 0, 0, 0, 0, time.UTC)
	ctx.EndDate = time.Date(2026, 5, 19, 0, 0, 0, 0, time.UTC)
	ctx.TotalDays = 10
	cases := map[string]time.Time{
		"upcoming (starts in 9 days)":        time.Date(2026, 5, 1, 15, 0, 0, 0, time.UTC),
		"in progress (today is day 3 of 10)": time.Date(2026, 5, 12, 8, 0, 0, 0, time.UTC),
		"completed":                          time.Date(2026, 10, 13, 0, 0, 0, 0, time.UTC),
	}
	for want, today := range cases {
		if got := tripStatus(ctx, today); got != want {
			t.Errorf("tripStatus(%s) = %q, want %q", today.Format("2006-01-02"), got, want)
		}
	}
}

func TestBuildPrompt_TransportTimesAreNotShifted(t *testing.T) {
	ctx := *newTripContext()
	dep := time.Date(2026, 5, 10, 6, 30, 0, 0, time.UTC).In(time.FixedZone("WIB", 7*3600))
	ctx.Transportations = []TransportationContext{{Type: "flight", FromLocation: "CGK", ToLocation: "NRT", DepartureDatetime: &dep}}
	_, user := BuildPrompt(ctx)
	if !strings.Contains(user, "departs 2026-05-10 06:30") {
		t.Errorf("departure time shifted by the time zone\n---\n%s", user)
	}
}
