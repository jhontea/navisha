package summary

import (
	"strings"
	"testing"
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

func TestBuildPrompt_ConciseVoiceWithoutEmoji(t *testing.T) {
	system, _ := BuildPrompt(*newTripContext())
	for _, want := range []string{"## Ringkasan", "## Budget", "## Booking", "250–350 kata", "Tanpa emoji", "cakep abis"} {
		if !strings.Contains(system, want) {
			t.Errorf("system prompt missing %q", want)
		}
	}
	if strings.Contains(system, "GUNAKAN EMOJI") {
		t.Error("system prompt still asks for emoji section headers")
	}
}
