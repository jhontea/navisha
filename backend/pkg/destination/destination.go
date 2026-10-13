// Package destination holds small helpers about trip destinations that are
// shared by the AI prompt builders (autogen, summary).
package destination

import "strings"

// indonesiaPlaces are lowercase names that identify a destination inside
// Indonesia when the country is not spelled out (e.g. "Ubud" instead of
// "Ubud, Bali, Indonesia"). Matched as whole words.
var indonesiaPlaces = []string{
	"indonesia",
	// islands & regions
	"bali", "lombok", "java", "jawa", "sumatra", "sumatera", "kalimantan", "borneo",
	"sulawesi", "papua", "flores", "komodo", "nusa penida", "gili", "bintan", "batam",
	"belitung", "bangka", "raja ampat", "labuan bajo", "toba", "wakatobi", "sumba",
	"maluku", "ambon", "aceh",
	// cities & areas
	"jakarta", "bandung", "bogor", "yogyakarta", "jogja", "jogjakarta", "solo", "surakarta",
	"semarang", "surabaya", "malang", "batu", "bromo", "banyuwangi", "denpasar", "ubud",
	"kuta", "seminyak", "canggu", "sanur", "medan", "padang", "bukittinggi", "palembang",
	"pekanbaru", "makassar", "manado", "balikpapan", "pontianak", "mataram", "kupang",
	"puncak", "garut", "dieng", "magelang", "borobudur", "cirebon", "tangerang", "bekasi", "depok",
}

// IsIndonesia reports whether a free-text destination (as typed by the user
// or returned by the location autocomplete) is in Indonesia.
func IsIndonesia(dest string) bool {
	d := " " + normalize(dest) + " "
	for _, p := range indonesiaPlaces {
		if strings.Contains(d, " "+p+" ") {
			return true
		}
	}
	return false
}

// normalize lowercases and turns punctuation into spaces so places can be
// matched as whole words ("Ubud, Bali" -> "ubud bali").
func normalize(s string) string {
	var b strings.Builder
	b.Grow(len(s))
	for _, r := range strings.ToLower(s) {
		if r >= 'a' && r <= 'z' || r >= '0' && r <= '9' {
			b.WriteRune(r)
		} else {
			b.WriteRune(' ')
		}
	}
	return strings.Join(strings.Fields(b.String()), " ")
}
