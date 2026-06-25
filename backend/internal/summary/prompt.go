package summary

import (
	"fmt"
	"strings"
)

const systemPrompt = `Halo! Kamu asisten travel yang asik dan santai. Bantu user rangkum trip mereka dengan gaya ngobrol santai tapi tetap informatif.
Tulis ringkasan perjalanan yang:
- Ceritakan vibes & suasana trip ini secara singkat
- Sebutkan aktivitas seru dan tempat yang bakal dikunjungi
- Catat akomodasi & transportasi yang udah diatur
- Kasih komentar soal budget (masih aman / pas / exceed) dengan nada ringan
- Kasih 1-2 tips praktis yang beneran berguna

FORMAT OUTPUT:
Gunakan markdown yang rapi dan enak dibaca:
- Pakai ## untuk section utama + EMOJI di depannya (contoh: "## 🗺️ Tentang Trip Ini", "## 💰 Budget", "## 🏨 Akomodasi & Transportasi", "## 💡 Tips Jalan-Jalan")
- Untuk data BUDGET, pakai TABEL markdown:
  | Kategori | Jumlah | % dari Budget |
  |----------|--------|---------------|
  | Kuliner  | Rp X   | Y%            |
- Pakai **bold** buat highlight kata kunci & angka penting
- Pakai bullet list (- ) buat rekomendasi atau tips
- Pakai blockquote (>) buat highlight penting

REKOMENDASI AKTIVITAS:
Kalau ada hari yang masih kosong aktivitasnya, tambahin section "## 💡 Rekomendasi Aktivitas" di akhir.
- Kasih saran aktivitas yang nyambung sama destinasi (tempat wisata, kuliner, pengalaman khas).
- Sebutin hari mana yang kosong, terus kasih ide buat ngisinya.
- Kasih 3-6 rekomendasi dalam bullet list, singkat dan actionable.
- Jelasin kalo ini cuma SARAN/IDE (bukan itinerary yang udah fix).
Kalau semua hari udah penuh, SKIP aja section ini.

PENTING: Tulis dalam Bahasa Indonesia yang santai dan natural, kayak ngobrol santai ke temen.
Jangan kaku atau terlalu formal. Bikin user ngerasa dibantu, bukan digurui. Gunakan sapaan "kamu", "Saya", atau "anda" — HINDARI kata "lo", "gue", "elu", atau bahasa gaul berlebihan.
JANGAN ngarang tempat atau aktivitas yang UDAH ADA di data trip (ringkasan harus faktual).
Rekomendasi aktivitas BARU boleh banget selama relevan & ditandai sebagai saran.
Kalau data minim, bilang aja apa adanya & saranin user buat nambah detail.`

// BuildPrompt returns the system and user messages for the LLM call.
// Separated from usecase so it can be unit-tested without an LLM.
func BuildPrompt(ctx TripContext) (system, user string) {
	var b strings.Builder

	b.WriteString(fmt.Sprintf("Trip: %s\n", ctx.Title))
	if ctx.Destination != "" {
		b.WriteString(fmt.Sprintf("Destination: %s\n", ctx.Destination))
	}
	b.WriteString(fmt.Sprintf("Dates: %s to %s (%d days)\n",
		ctx.StartDate.Format("2006-01-02"),
		ctx.EndDate.Format("2006-01-02"),
		ctx.TotalDays))
	b.WriteString(fmt.Sprintf("Currency: %s\n", ctx.BaseCurrency))

	if ctx.Budget > 0 {
		b.WriteString(fmt.Sprintf("Budget: %.2f %s\n", ctx.Budget, ctx.BaseCurrency))
	}
	if ctx.TotalSpent > 0 {
		b.WriteString(fmt.Sprintf("Total Spent: %.2f %s\n", ctx.TotalSpent, ctx.BaseCurrency))
		if ctx.Budget > 0 {
			remaining := ctx.Budget - ctx.TotalSpent
			if remaining >= 0 {
				b.WriteString(fmt.Sprintf("Remaining: %.2f %s\n", remaining, ctx.BaseCurrency))
			} else {
				b.WriteString(fmt.Sprintf("Over budget by: %.2f %s\n", -remaining, ctx.BaseCurrency))
			}
		}
	}

	// Expense breakdown
	if len(ctx.ExpenseByCategory) > 0 {
		b.WriteString("\nExpense Breakdown:\n")
		for _, cat := range ctx.ExpenseByCategory {
			b.WriteString(fmt.Sprintf("  - %s: %.2f %s\n", cat.Category, cat.Total, ctx.BaseCurrency))
		}
	}

	// Accommodations
	if len(ctx.Accommodations) > 0 {
		b.WriteString("\nAccommodations:\n")
		for _, acc := range ctx.Accommodations {
			b.WriteString(fmt.Sprintf("  - %s (%s) at %s, %s to %s\n",
				acc.Name, acc.Type, acc.LocationName,
				acc.CheckIn.Format("2006-01-02"),
				acc.CheckOut.Format("2006-01-02")))
		}
	}

	// Transportations
	if len(ctx.Transportations) > 0 {
		b.WriteString("\nTransportation:\n")
		for _, t := range ctx.Transportations {
			line := fmt.Sprintf("  - %s: %s → %s", t.Type, t.FromLocation, t.ToLocation)
			if t.DepartureDatetime != nil {
				line += fmt.Sprintf(" (departs %s)", t.DepartureDatetime.Format("2006-01-02 15:04"))
			}
			b.WriteString(line + "\n")
		}
	}

	// Daily itinerary (cap at 14 days to stay within token budget)
	maxDays := 14
	days := ctx.Days
	if len(days) > maxDays {
		days = days[:maxDays]
	}

	// Count days without any activities and how many activities exist overall,
	// so the model can decide whether to add an "Rekomendasi Aktivitas" section.
	emptyDays := make([]int, 0)
	totalActivities := 0
	for _, day := range ctx.Days {
		totalActivities += len(day.Activities)
		if len(day.Activities) == 0 {
			emptyDays = append(emptyDays, day.DayNumber)
		}
	}

	if len(days) > 0 {
		b.WriteString("\nDaily Itinerary:\n")
		for _, day := range days {
			b.WriteString(fmt.Sprintf("  Day %d (%s):\n", day.DayNumber, day.Date.Format("2006-01-02")))
			if len(day.Activities) == 0 {
				b.WriteString("    (no activities planned)\n")
				continue
			}
			// Cap activities per day at 8
			acts := day.Activities
			if len(acts) > 8 {
				acts = acts[:8]
			}
			for _, act := range acts {
				timeStr := ""
				if act.StartTime != "" {
					timeStr = act.StartTime
					if act.EndTime != "" {
						timeStr += "-" + act.EndTime
					}
					timeStr = " [" + timeStr + "]"
				}
				loc := ""
				if act.LocationName != "" {
					loc = " @ " + act.LocationName
				}
				b.WriteString(fmt.Sprintf("    - %s%s (%s)%s\n", act.Title, timeStr, act.Type, loc))
			}
			if len(day.Activities) > 8 {
				b.WriteString(fmt.Sprintf("    ... and %d more activities\n", len(day.Activities)-8))
			}
		}
		if len(ctx.Days) > maxDays {
			b.WriteString(fmt.Sprintf("  ... and %d more days\n", len(ctx.Days)-maxDays))
		}
	}

	// Itinerary density signal — tells the model where to recommend activities.
	b.WriteString(fmt.Sprintf("\nItinerary Density: %d/%d days have activities",
		ctx.TotalDays-len(emptyDays), ctx.TotalDays))
	if totalActivities == 0 {
		b.WriteString(" — trip has no activities yet, please recommend some!\n")
	} else if len(emptyDays) > 0 {
		b.WriteString(fmt.Sprintf(" — empty days: %v\n", emptyDays))
	} else {
		b.WriteString("\n")
	}

	return systemPrompt, b.String()
}
