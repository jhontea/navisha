package summary

import (
	"fmt"
	"hash/fnv"
	"strings"
)

// hashSeed returns a uint32 hash for use in deterministic selection.
func hashSeed(s string) uint32 {
	h := fnv.New32a()
	h.Write([]byte(s))
	return h.Sum32()
}

// StyleVariant controls the tone and focus of the generated summary.
// Phase 3E: reduces monotony by rotating through distinct styles.
type StyleVariant string

const (
	StyleEksplorer StyleVariant = "eksplorer" // adventure-focused
	StyleSantai    StyleVariant = "santai"    // relaxed, comfort-focused
	StyleBudaya    StyleVariant = "budaya"    // culture and history
	StyleKuliner   StyleVariant = "kuliner"   // food-focused
	StyleFotogenik StyleVariant = "fotogenik" // photography and scenic spots
)

// AllStyleVariants lists all variants for deterministic rotation.
var AllStyleVariants = []StyleVariant{StyleEksplorer, StyleSantai, StyleBudaya, StyleKuliner, StyleFotogenik}

// StyleForTrip deterministically picks a style variant based on trip ID hash.
func StyleForTrip(tripID string) StyleVariant {
	h := fnv.New32a()
	h.Write([]byte(tripID))
	idx := int(h.Sum32()) % len(AllStyleVariants)
	return AllStyleVariants[idx]
}

// TemperatureForTrip returns a temperature value (0.7–0.9) based on trip ID hash.
func TemperatureForTrip(tripID string) float64 {
	h := fnv.New32a()
	h.Write([]byte(tripID))
	base := float64(h.Sum32()%200) / 1000.0 // 0.000–0.199
	return 0.7 + base
}

// emojiSet defines an alternate set of section header emojis to rotate through.
type emojiSet struct {
	overview      string
	budget        string
	accommodation string
	tips          string
}

var emojiSets = []emojiSet{
	{overview: "🗺️", budget: "💰", accommodation: "🏨", tips: "💡"},
	{overview: "✈️", budget: "💵", accommodation: "🏠", tips: "🎯"},
	{overview: "🌍", budget: "🪙", accommodation: "🏕️", tips: "✨"},
}

func emojiForTrip(tripID string) emojiSet {
	h := fnv.New32a()
	h.Write([]byte(tripID))
	return emojiSets[int(h.Sum32())%len(emojiSets)]
}

// stylePrompt returns additional system instructions based on the style variant.
func stylePrompt(v StyleVariant) string {
	switch v {
	case StyleEksplorer:
		return `FOKUS: Adventure & eksplorasi. Tonjolkan hidden gems, aktivitas outdoor, hidden spots, dan pengalaman yang memacu adrenalin. Gunakan bahasa yang bersemangat dan inspiring.`
	case StyleSantai:
		return `FOKUS: Relaksasi & kenyamanan. Tonjolkan tempat santai, spa, café cozy, pemandangan tenang, dan pace yang slow. Gunakan bahasa yang calming dan chill.`
	case StyleBudaya:
		return `FOKUS: Budaya & sejarah lokal. Tonjolkan museum, pura/candi, kesenian tradisional, cerita sejarah, dan kearifan lokal. Gunakan bahasa yang insightful dan curious.`
	case StyleKuliner:
		return `FOKUS: Kuliner & makanan. Tonjolkan makanan khas, street food, restoran rekomendasi, food market, dan pengalaman gastronomi. Gunakan bahasa yang menggugah selera.`
	case StyleFotogenik:
		return `FOKUS: Spot foto Instagrammable. Tonjolkan tempat dengan pemandangan indah, golden hour spot, arsitektur unik, dan lokasi foto terbaik. Gunakan bahasa visual dan deskriptif.`
	default:
		return ""
	}
}

// tipsPrompt formats the local tips for injection into the system prompt.
func tipsPrompt(tips []string) string {
	if len(tips) == 0 {
		return ""
	}
	var b strings.Builder
	b.WriteString("\n\nTIPS LOKAL (sisipkan 1-2 yang paling relevan dengan trip ini):\n")
	for _, t := range tips {
		b.WriteString("- " + t + "\n")
	}
	return b.String()
}

const systemPromptBase = `Halo! Kamu asisten travel yang asik dan santai. Bantu user rangkum trip mereka dengan gaya ngobrol santai tapi tetap informatif.
Tulis ringkasan perjalanan yang:
- Ceritakan vibes & suasana trip ini secara singkat
- Sebutkan aktivitas seru dan tempat yang bakal dikunjungi
- Catat akomodasi & transportasi yang udah diatur
- Kasih komentar soal budget (masih aman / pas / exceed) dengan nada ringan
- Kasih 1-2 tips praktis yang beneran berguna

FORMAT OUTPUT:
Gunakan markdown yang rapi dan enak dibaca:
- Pakai ## untuk section utama + EMOJI di depannya
- Untuk data BUDGET, pakai TABEL markdown
- Pakai **bold** buat highlight kata kunci & angka penting
- Pakai bullet list (- ) buat rekomendasi atau tips
- Pakai blockquote (>) buat highlight penting

REKOMENDASI AKTIVITAS:
Kalau ada hari yang masih kosong aktivitasnya, tambahin section rekomendasi aktivitas di akhir.
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
// Phase 3E: accepts style variant, emoji set, local tips, and trip context
// for varied, non-monotonous output.
func BuildPrompt(ctx TripContext) (system, user string) {
	style := StyleForTrip(ctx.TripID)
	emojis := emojiForTrip(ctx.TripID)
	tips := pickTips(hashSeed(ctx.TripID), 2)

	// System prompt: base + style + tips
	var sb strings.Builder
	sb.WriteString(systemPromptBase)
	sb.WriteString("\n\n" + stylePrompt(style))
	sb.WriteString(tipsPrompt(tips))

	// Emoji instructions
	sb.WriteString(fmt.Sprintf(
		"\n\nGUNAKAN EMOJI BERIKUT UNTUK SECTION HEADER (hanya emoji ini, jangan yang lain):\n"+
			"- Overview: %s\n- Budget: %s\n- Akomodasi & Transportasi: %s\n- Tips: %s",
		emojis.overview, emojis.budget, emojis.accommodation, emojis.tips,
	))

	system = sb.String()

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

	if ctx.Budget > 0 {
		ub.WriteString(fmt.Sprintf("Budget: %.2f %s\n", ctx.Budget, ctx.BaseCurrency))
	}
	if ctx.TotalSpent > 0 {
		ub.WriteString(fmt.Sprintf("Total Spent: %.2f %s\n", ctx.TotalSpent, ctx.BaseCurrency))
		if ctx.Budget > 0 {
			remaining := ctx.Budget - ctx.TotalSpent
			if remaining >= 0 {
				ub.WriteString(fmt.Sprintf("Remaining: %.2f %s\n", remaining, ctx.BaseCurrency))
			} else {
				ub.WriteString(fmt.Sprintf("Over budget by: %.2f %s\n", -remaining, ctx.BaseCurrency))
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
			ub.WriteString(fmt.Sprintf("  - %s: %.2f %s\n", cat.Category, cat.Total, ctx.BaseCurrency))
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

	// Count empty days for itinerary density signal
	emptyDays := make([]int, 0)
	totalActivities := 0
	for _, day := range ctx.Days {
		totalActivities += len(day.Activities)
		if len(day.Activities) == 0 {
			emptyDays = append(emptyDays, day.DayNumber)
		}
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
