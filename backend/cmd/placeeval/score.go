package main

import (
	"math"
	"strings"
	"unicode"
)

// verdict grades a provider's top result for one query.
type verdict string

const (
	verdictOK        verdict = "ok"    // right name (or the right kind of place) in the right area
	verdictWrongArea verdict = "far"   // top result outside the area
	verdictWrongName verdict = "name"  // in the area but a different place
	verdictNone      verdict = "none"  // no results
	verdictError     verdict = "error" // the request failed
)

// Words that say where or what kind of place, not which one; a result need
// not repeat them to be the right place.
var genericWords = map[string]bool{
	"jakarta": true, "bandung": true, "cirebon": true, "ubud": true, "ancol": true, "senayan": true,
	"di": true, "dekat": true, "jalan": true, "jl": true, "hotel": true, "stasiun": true, "bandara": true,
	"the": true, "and": true,
}

// nameTokens lowercases s and splits it into words of 3+ letters/digits that
// are not generic.
func nameTokens(s string) []string {
	fields := strings.FieldsFunc(strings.ToLower(s), func(r rune) bool { return !unicode.IsLetter(r) && !unicode.IsDigit(r) })
	out := fields[:0]
	for _, f := range fields {
		if len([]rune(f)) >= 3 && !genericWords[f] {
			out = append(out, f)
		}
	}
	return out
}

// nameMatches reports whether more than half of the query's distinctive words
// appear in the result's name or address.
func nameMatches(query string, p place) bool {
	want := nameTokens(query)
	if len(want) == 0 {
		return true
	}
	have := map[string]bool{}
	for _, t := range nameTokens(p.Name + " " + p.Address) {
		have[t] = true
	}
	hits := 0
	for _, w := range want {
		if have[w] {
			hits++
		}
	}
	if hits*2 > len(want) {
		return true
	}
	// "Sea World" vs "SeaWorld": the words run together.
	return strings.Contains(strings.Join(nameTokens(p.Name+" "+p.Address), ""), strings.Join(want, ""))
}

// isKind reports whether the place's name contains one of the category words.
func isKind(words []string, p place) bool {
	name := strings.ToLower(p.Name)
	for _, w := range words {
		if strings.Contains(name, w) {
			return true
		}
	}
	return false
}

func grade(q evalQuery, results []place, err error) verdict {
	switch {
	case err != nil:
		return verdictError
	case len(results) == 0:
		return verdictNone
	}
	top := results[0]
	if distanceKm(q.Area.Lat, q.Area.Lng, top.Lat, top.Lng) > q.Area.RadiusKm {
		return verdictWrongArea
	}
	if len(q.Category) > 0 {
		if !isKind(q.Category, top) {
			return verdictWrongName
		}
	} else if !nameMatches(q.Query, top) {
		return verdictWrongName
	}
	return verdictOK
}

func distanceKm(lat1, lng1, lat2, lng2 float64) float64 {
	const earthKm = 6371.0
	rad := math.Pi / 180
	dLat := (lat2 - lat1) * rad
	dLng := (lng2 - lng1) * rad
	a := math.Sin(dLat/2)*math.Sin(dLat/2) + math.Cos(lat1*rad)*math.Cos(lat2*rad)*math.Sin(dLng/2)*math.Sin(dLng/2)
	return 2 * earthKm * math.Asin(math.Sqrt(a))
}
