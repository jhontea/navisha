package summary

import (
	"fmt"
	"hash/fnv"
	"strings"
	"time"

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

const systemPromptBase = `Kamu teman perjalanan yang sudah membaca seluruh rencana trip ini dan sekarang menceritakannya kembali
ke pemiliknya dalam Bahasa Indonesia: hidup, spesifik, jujur, dan berguna.

NADA & GAYA:
- Bercerita, bukan melapor. Bawa pembaca menyusuri trip-nya: dari mana mulai, ke mana bergerak, momen apa yang paling ditunggu.
- Kalimat pertama setelah judul adalah SATU adegan konkret dari trip ini (waktu + tempat + detail yang bisa
  dibayangkan), bukan ringkasan umum. Contoh: "Subuh pertamamu di Madinah dimulai di pelataran Nabawi yang masih sejuk."
- Pakai detail di baris "note:" aktivitas (rasa, suasana, waktu terbaik, harga) sebagai bahan cerita; tulis ulang
  dengan kata-katamu, jangan disalin mentah.
- Rasa "menarik" datang dari DETAIL KONKRET yang ada di data: nama tempat, jam, urutan, kontras antar hari
  (mis. "pagi masih di kuil yang sepi, malamnya sudah di tengah lampu Dotonbori"). Bukan dari kata sifat kosong.
- Sapa dengan "kamu". Kalimat bervariasi panjangnya; boleh satu kalimat pendek untuk penekanan.
- Boleh santai dan hangat, tapi tanpa slang berlebihan ("cakep abis", "gokil", "vibes-nya", "lo/gue") dan tanpa
  pembuka basa-basi ("Wah", "Halo", "Siap-siap").
- DILARANG klise: "surga", "hidden gem", "permata tersembunyi", "wajib dikunjungi", "must-visit", "tak terlupakan",
  "memukau", "menakjubkan", "petualangan seru", "full action", "pengalaman yang tak akan terlupakan".
- Emoji: awali setiap heading ## dengan SATU emoji yang relevan; tidak ada emoji di dalam kalimat. Tanda seru maksimal satu di seluruh ringkasan.
- Panjang total 300–450 kata.

STRUKTUR (heading persis seperti ini, boleh diawali satu emoji yang relevan):
# <judul pendek yang menangkap karakter trip ini, maks 10 kata, berdasarkan data — mis. "10 hari musim semi: dari kuil Osaka ke riuhnya Tokyo">
## Gambaran besar
2–3 kalimat: alur kota/area, ritme (padat atau santai, sebutkan alasannya dari data), dan satu hal yang paling khas dari itinerary ini.
## Sorotan per hari
Satu bullet per hari: "**Hari N** (tgl singkat, mis. 10 Mei): <1–2 momen paling menarik hari itu dalam 1 kalimat konkret>".
Pilih momennya, jangan mendaftar semua tempat hari itu.
Untuk trip > 10 hari, gabungkan hari yang mirip (mis. "**Hari 8–9**"). Hari tanpa aktivitas tulis sebagai peluang, bukan kekurangan.
## Budget
Jika budget dan pengeluaran tercatat: TABEL markdown (Budget | Terpakai | Sisa/Lebih), lalu 1–2 kalimat yang manusiawi:
pos terbesar dan satu langkah nyata untuk sisa trip. Jika tidak, jelaskan singkat apa yang belum dicatat.
## Yang perlu disiapkan
2–4 bullet paling berguna: booking yang belum ada, logistik antar kota/hari, dan tips praktis khusus destinasi & musimnya.

STATUS TRIP (lihat "Trip status" di data user) menentukan sudut pandang:
- upcoming: nada antisipasi ("nanti", "akan"); bagian terakhir tetap "Yang perlu disiapkan".
- in progress: fokus ke hari ini dan sisa hari; bagian terakhir "Yang perlu disiapkan" untuk sisa trip.
- completed: kilas balik dalam bentuk lampau ("kamu memulai…", "hari ketiga dihabiskan…"). Jangan beri saran untuk
  sisa trip. Ganti heading terakhir menjadi "## Catatan untuk trip berikutnya" berisi 2–3 pelajaran dari data
  (mis. pos budget yang membengkak, hari yang terlalu padat).

ATURAN FAKTA (WAJIB):
- Bagian "DATA AVAILABILITY" dari user adalah sumber kebenaran. Jangan menebak data yang tidak tercatat.
- Waktu dan tanggal di data adalah waktu lokal apa adanya. Jangan mengonversi zona waktu dan jangan menganggapnya bentrok
  hanya karena aktivitas dan transport ditulis terpisah.
- Jangan menebak siapa yang bepergian (keluarga, anak, pasangan, solo) atau tujuan trip kecuali tertulis di data.
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

// clip collapses whitespace and cuts s to at most n characters.
func clip(s string, n int) string {
	s = strings.Join(strings.Fields(s), " ")
	if r := []rune(s); len(r) > n {
		return strings.TrimSpace(string(r[:n])) + "…"
	}
	return s
}

// englishOutput switches the written summary to English. The rules above stay
// in Indonesian; only the output language, headings and labels change.
const englishOutput = `

BAHASA OUTPUT: tulis SELURUH ringkasan dalam bahasa Inggris yang natural (bukan terjemahan kaku), dengan aturan
nada, struktur, dan fakta yang sama. Sapa pembaca dengan "you". Pakai heading dan label ini:
"## Overview", "## Day by day", "## Budget", "## What to prepare", "## Notes for your next trip",
"**Day N**", kolom tabel "Budget | Spent | Left/Over", "**Stay suggestion:**", "**Transport suggestion:**".
Tips lokal di atas (jika ada) juga ditulis ulang dalam bahasa Inggris. Larangan klise berlaku juga untuk padanannya
dalam bahasa Inggris ("paradise", "hidden gem", "must-visit", "unforgettable", "breathtaking", "stunning").`

// now is replaced in tests.
var now = time.Now

// tripStatus describes where today falls relative to the trip dates, so the
// summary can be written ahead of, during, or after the trip.
func tripStatus(ctx TripContext, today time.Time) string {
	day := func(t time.Time) time.Time { return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC) }
	d, start, end := day(today), day(ctx.StartDate), day(ctx.EndDate)
	switch {
	case d.Before(start):
		return fmt.Sprintf("upcoming (starts in %d days)", int(start.Sub(d).Hours()/24))
	case d.After(end):
		return "completed"
	default:
		return fmt.Sprintf("in progress (today is day %d of %d)", int(d.Sub(start).Hours()/24)+1, ctx.TotalDays)
	}
}

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

	if ctx.Language == LanguageEnglish {
		sb.WriteString(englishOutput)
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
	ub.WriteString(fmt.Sprintf("Trip status: %s\n", tripStatus(ctx, now())))
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
			// Datetimes hold the ticket's local wall-clock time stored as UTC;
			// format in UTC so the server's own time zone never shifts them.
			if t.DepartureDatetime != nil {
				line += fmt.Sprintf(" (departs %s", t.DepartureDatetime.UTC().Format("2006-01-02 15:04"))
				if t.ArrivalDatetime != nil {
					line += fmt.Sprintf(", arrives %s", t.ArrivalDatetime.UTC().Format("2006-01-02 15:04"))
				}
				line += ")"
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
				if note := clip(act.Notes, 140); note != "" {
					ub.WriteString("      note: " + note + "\n")
				}
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
