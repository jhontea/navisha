package summary

import (
	"fmt"
	"strings"
	"time"
)

const systemPrompt = `Kamu adalah asisten perencana perjalanan yang ramah dan ringkas.
Berdasarkan detail sebuah trip, tulis ringkasan singkat dan menarik (3-5 paragraf) yang:
- Menggambarkan suasana keseluruhan trip dan destinasinya
- Menyebutkan aktivitas utama dan tempat yang akan dikunjungi
- Mencatat pengaturan akomodasi dan transportasi
- Memberi komentar tentang status anggaran (di bawah/pas/melebihi anggaran)
- Memberikan 1-2 tips atau saran praktis

REKOMENDASI AKTIVITAS:
Jika ada hari yang belum punya aktivitas, atau itinerary masih terasa kosong/minim,
tambahkan SATU bagian markdown berjudul "## Rekomendasi Aktivitas" di akhir ringkasan.
- Berikan saran aktivitas yang relevan dengan destinasi trip (tempat wisata, kuliner, atau pengalaman khas daerah tersebut).
- Sebutkan hari mana yang masih kosong jika informasinya tersedia, lalu usulkan ide untuk mengisinya.
- Beri 3-6 rekomendasi konkret dalam bentuk bullet list, ringkas dan praktis.
- Tandai dengan jelas bahwa ini adalah SARAN/IDE (bukan bagian dari rencana yang sudah dibuat user).
Jika semua hari sudah terisi penuh, BAGIAN INI BOLEH DILEWATI.

PENTING: Tulis seluruh ringkasan dalam Bahasa Indonesia yang natural dan hangat.
Gunakan format markdown. Buat terasa ramah dan membantu, jangan kaku.
JANGAN mengarang tempat atau aktivitas YANG SUDAH ADA di data trip (bagian ringkasan harus faktual).
Rekomendasi aktivitas baru DIPERBOLEHKAN selama relevan dengan destinasi dan ditandai sebagai saran.
Jika data minim, akui hal itu dan sarankan pengguna menambahkan detail lebih lanjut.`

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

// EstimateTokenCount gives a rough token estimate (1 token ≈ 4 chars for English).
// Used for cost-awareness display in the UI.
func EstimateTokenCount(system, user string) int {
	return (len(system) + len(user)) / 4
}

// FormatDuration returns a human-readable duration string.
func FormatDuration(d time.Duration) string {
	if d < time.Minute {
		return fmt.Sprintf("%ds", int(d.Seconds()))
	}
	return fmt.Sprintf("%dm %ds", int(d.Minutes()), int(d.Seconds())%60)
}
