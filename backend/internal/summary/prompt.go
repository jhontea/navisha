package summary

import (
	"fmt"
	"hash/fnv"
	"strings"

	"github.com/ahmadhafizh/navisha/backend/pkg/destination"
	"github.com/ahmadhafizh/navisha/backend/pkg/money"
)

// hashSeed returns a uint32 hash for use in deterministic selection.
func hashSeed(s string) uint32 {
	h := fnv.New32a()
	h.Write([]byte(s))
	return h.Sum32()
}

// TemperatureForTrip returns a temperature value (0.7–0.9) based on trip ID hash.
func TemperatureForTrip(tripID string) float64 {
	h := fnv.New32a()
	h.Write([]byte(tripID))
	base := float64(h.Sum32()%200) / 1000.0 // 0.000–0.199
	return 0.7 + base
}

// tipsPrompt formats the local tips for injection into the system prompt.
func tipsPrompt(tips []string) string {
	if len(tips) == 0 {
		return ""
	}
	var b strings.Builder
	b.WriteString("\n\nTIPS LOKAL INDONESIA (boleh sisipkan 1 yang paling relevan, tulis ulang dengan gaya di atas):\n")
	for _, t := range tips {
		b.WriteString("- " + t + "\n")
	}
	return b.String()
}

const systemPromptBase = `Kamu membantu traveler memahami rencana trip mereka. Tulis ringkasan trip dalam Bahasa Indonesia.

NADA & GAYA:
- Hangat tapi ringkas: sapa dengan "kamu", kalimat pendek, langsung ke inti. Seperti teman yang teliti, bukan pembawa acara.
- Tulis fakta dan saran yang bisa langsung dipakai. Tanpa basa-basi pembuka ("Wah", "Halo", "Siap-siap"), tanpa slang
  ("cakep abis", "gokil", "vibes-nya"), tanpa "lo/gue".
- DILARANG kata/frasa klise: "surga", "hidden gem", "permata tersembunyi", "wajib dikunjungi", "must-visit", "tak terlupakan",
  "memukau", "menakjubkan", "petualangan seru", "full action".
- Tanpa emoji. Tanda seru maksimal satu di seluruh ringkasan.
- Panjang total 250–350 kata.

STRUKTUR (pakai heading persis seperti ini, tanpa emoji):
## Ringkasan
2–3 kalimat: area yang dikunjungi, ritme trip (padat/santai), dan hal paling khas dari itinerary ini.
## Budget
Jika budget dan pengeluaran tercatat, tampilkan TABEL markdown (Budget | Terpakai | Sisa/Lebih) lalu 1 kalimat penilaian.
Jika tidak, jelaskan singkat apa yang belum dicatat.
## Booking
Akomodasi dan transportasi yang sudah tercatat (bullet), atau saran jika kosong (lihat aturan fakta).
## Saran
2–4 bullet yang paling berguna: tips praktis khusus destinasi dan/atau rekomendasi untuk hari yang masih kosong.
Hapus section ini jika tidak ada yang penting untuk disarankan.

ATURAN FAKTA (WAJIB):
- Bagian "DATA AVAILABILITY" dari user adalah sumber kebenaran. Jangan menebak data yang tidak tercatat.
- Jangan menganggap judul aktivitas seperti "check-in", "naik kereta", atau "perjalanan ke ..." sebagai data akomodasi atau transportasi yang sudah dipesan.
- Jika Accommodations = 0, sebutkan singkat bahwa akomodasi belum ditambahkan, lalu WAJIB beri 1-2 **Saran akomodasi:** yang actionable berdasarkan area dan alur itinerary. Fokus pada area/tipe penginapan; jangan mengarang hotel yang sudah dipesan atau ketersediaannya.
- Jika Transportation = 0, sebutkan singkat bahwa transportasi belum ditambahkan, lalu WAJIB beri 1-2 **Saran transportasi:** berupa moda atau rute yang relevan dengan perpindahan di itinerary. Jangan menulisnya seolah sudah dipesan.
- Jika Budget configured = no, jangan menilai budget aman/pas/exceed. Katakan budget belum ditentukan.
- Jika Expenses recorded = no, jangan menyimpulkan pengeluaran aktual adalah nol; katakan belum ada pengeluaran yang dicatat.
- Jangan berhenti hanya dengan kalimat "belum ada data" jika akomodasi atau transportasi kosong; tujuan ringkasan adalah membantu user mengambil langkah berikutnya.
- Semua rekomendasi harus diberi label jelas sebagai saran dan tidak boleh ditulis seolah sudah dipesan atau tercatat.
- Jangan mengarang tempat atau aktivitas yang tidak ada di data trip; rekomendasi baru harus ditandai sebagai saran.
- Tulis angka uang persis seperti di data (jangan menambah desimal), dengan kode mata uangnya.
- Tips harus sesuai destinasi trip ini (negara, kota, musim). Jangan memberi tips untuk negara lain.`

// BuildPrompt returns the system and user messages for the LLM call.
// Phase 3E: accepts style variant, emoji set, local tips, and trip context
// for varied, non-monotonous output.
func BuildPrompt(ctx TripContext) (system, user string) {
	// System prompt: base + local tips. The curated tip pool is about
	// Indonesia, so it is only offered for Indonesian destinations.
	var sb strings.Builder
	sb.WriteString(systemPromptBase)
	if destination.IsIndonesia(ctx.Destination) {
		sb.WriteString(tipsPrompt(pickTips(hashSeed(ctx.TripID), 2)))
	}

	system = sb.String()

	emptyDays := make([]int, 0)
	totalActivities := 0
	for _, day := range ctx.Days {
		totalActivities += len(day.Activities)
		if len(day.Activities) == 0 {
			emptyDays = append(emptyDays, day.DayNumber)
		}
	}

	// User prompt — same structure as before
	var ub strings.Builder
	ub.WriteString(fmt.Sprintf("Trip: %s\n", ctx.Title))
	if ctx.Destination != "" {
		ub.WriteString(fmt.Sprintf("Destination: %s\n", ctx.Destination))
	}
	ub.WriteString(fmt.Sprintf("Dates: %s to %s (%d days)\n",
		ctx.StartDate.Format("2006-01-02"),
		ctx.EndDate.Format("2006-01-02"),
		ctx.TotalDays))
	ub.WriteString(fmt.Sprintf("Currency: %s\n", ctx.BaseCurrency))
	ub.WriteString("\nDATA AVAILABILITY (AUTHORITATIVE - do not infer missing records):\n")
	ub.WriteString(fmt.Sprintf("- Activities recorded: %d\n", totalActivities))
	ub.WriteString(fmt.Sprintf("- Accommodations recorded: %d", len(ctx.Accommodations)))
	if len(ctx.Accommodations) == 0 {
		ub.WriteString(" (none added)\n")
		ub.WriteString("  Required: provide 1-2 clearly labeled accommodation suggestions based on itinerary areas.\n")
	} else {
		ub.WriteString("\n")
	}
	ub.WriteString(fmt.Sprintf("- Transportation records: %d", len(ctx.Transportations)))
	if len(ctx.Transportations) == 0 {
		ub.WriteString(" (none added)\n")
		ub.WriteString("  Required: provide 1-2 clearly labeled transportation suggestions based on itinerary movements.\n")
	} else {
		ub.WriteString("\n")
	}
	if ctx.Budget > 0 {
		ub.WriteString(fmt.Sprintf("- Budget configured: yes (%s)\n", money.Format(ctx.Budget, ctx.BaseCurrency)))
	} else {
		ub.WriteString("- Budget configured: no\n")
	}
	if ctx.TotalSpent > 0 || len(ctx.ExpenseByCategory) > 0 {
		ub.WriteString(fmt.Sprintf("- Expenses recorded: yes (total %s)\n", money.Format(ctx.TotalSpent, ctx.BaseCurrency)))
	} else {
		ub.WriteString("- Expenses recorded: no (do not describe this as actual spending of zero)\n")
	}

	if ctx.Budget > 0 {
		ub.WriteString(fmt.Sprintf("Budget: %s\n", money.Format(ctx.Budget, ctx.BaseCurrency)))
	}
	if ctx.TotalSpent > 0 {
		ub.WriteString(fmt.Sprintf("Total Spent: %s\n", money.Format(ctx.TotalSpent, ctx.BaseCurrency)))
		if ctx.Budget > 0 {
			remaining := ctx.Budget - ctx.TotalSpent
			if remaining >= 0 {
				ub.WriteString(fmt.Sprintf("Remaining: %s\n", money.Format(remaining, ctx.BaseCurrency)))
			} else {
				ub.WriteString(fmt.Sprintf("Over budget by: %s\n", money.Format(-remaining, ctx.BaseCurrency)))
			}
		}
	}

	// Trip duration context for style-aware suggestions
	if ctx.TotalDays <= 3 {
		ub.WriteString("Trip durasi pendek (short trip / weekend getaway).\n")
	} else if ctx.TotalDays >= 7 {
		ub.WriteString("Trip durasi panjang (extended trip).\n")
	}

	// Budget level context
	if ctx.Budget > 0 && ctx.TotalSpent > 0 {
		ratio := ctx.TotalSpent / ctx.Budget
		if ratio < 0.3 {
			ub.WriteString("Budget masih longgar — banyak sisa.\n")
		} else if ratio > 0.9 {
			ub.WriteString("Budget hampir habis — butuh tips hemat.\n")
		}
	}

	// Expense breakdown
	if len(ctx.ExpenseByCategory) > 0 {
		ub.WriteString("\nExpense Breakdown:\n")
		for _, cat := range ctx.ExpenseByCategory {
			ub.WriteString(fmt.Sprintf("  - %s: %s\n", cat.Category, money.Format(cat.Total, ctx.BaseCurrency)))
		}
	}

	// Accommodations
	if len(ctx.Accommodations) > 0 {
		ub.WriteString("\nAccommodations:\n")
		for _, acc := range ctx.Accommodations {
			ub.WriteString(fmt.Sprintf("  - %s (%s) at %s, %s to %s\n",
				acc.Name, acc.Type, acc.LocationName,
				acc.CheckIn.Format("2006-01-02"),
				acc.CheckOut.Format("2006-01-02")))
		}
	}

	// Transportations
	if len(ctx.Transportations) > 0 {
		ub.WriteString("\nTransportation:\n")
		for _, t := range ctx.Transportations {
			line := fmt.Sprintf("  - %s: %s → %s", t.Type, t.FromLocation, t.ToLocation)
			if t.DepartureDatetime != nil {
				line += fmt.Sprintf(" (departs %s)", t.DepartureDatetime.Format("2006-01-02 15:04"))
			}
			ub.WriteString(line + "\n")
		}
	}

	// Daily itinerary (cap at 14 days, 8 activities/day for token budget)
	maxDays := 14
	days := ctx.Days
	if len(days) > maxDays {
		days = days[:maxDays]
	}

	if len(days) > 0 {
		ub.WriteString("\nDaily Itinerary:\n")
		for _, day := range days {
			ub.WriteString(fmt.Sprintf("  Day %d (%s):\n", day.DayNumber, day.Date.Format("2006-01-02")))
			if len(day.Activities) == 0 {
				ub.WriteString("    (no activities planned)\n")
				continue
			}
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
				ub.WriteString(fmt.Sprintf("    - %s%s (%s)%s\n", act.Title, timeStr, act.Type, loc))
			}
			if len(day.Activities) > 8 {
				ub.WriteString(fmt.Sprintf("    ... and %d more activities\n", len(day.Activities)-8))
			}
		}
		if len(ctx.Days) > maxDays {
			ub.WriteString(fmt.Sprintf("  ... and %d more days\n", len(ctx.Days)-maxDays))
		}
	}

	// Itinerary density signal
	ub.WriteString(fmt.Sprintf("\nItinerary Density: %d/%d days have activities",
		ctx.TotalDays-len(emptyDays), ctx.TotalDays))
	if totalActivities == 0 {
		ub.WriteString(" — trip has no activities yet, please recommend some!\n")
	} else if len(emptyDays) > 0 {
		ub.WriteString(fmt.Sprintf(" — empty days: %v\n", emptyDays))
	} else {
		ub.WriteString("\n")
	}

	return system, ub.String()
}
