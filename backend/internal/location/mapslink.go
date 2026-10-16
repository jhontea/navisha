package location

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
)

// ErrUnsupportedLink indicates the pasted text is not a Google Maps link we
// can extract a place from.
var ErrUnsupportedLink = errors.New("unsupported or unrecognized maps link")

// mapsLink holds the pieces extracted from a Google Maps URL.
type mapsLink struct {
	// PlaceName is the human-readable place label embedded in the URL path
	// (e.g. "/maps/place/Cafe+Batavia/..." → "Cafe Batavia"). Empty for
	// coordinate-only links.
	PlaceName string
	// Query is the ?q= or ?query= parameter when present (share links often
	// carry the place name or coordinates there).
	Query string
	// Lat/Lng are the coordinates from the URL. Zero when absent.
	Lat float64
	Lng float64
}

var (
	// Matches the canonical /maps/place/<label>/@lat,lng,zoom form.
	placePathRe = regexp.MustCompile(`(?i)/maps/place/([^/@]+)/?(?:.*@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)?)?`)
	// Matches @lat,lng anywhere in the path (e.g. /maps/@lat,lng,17z).
	atCoordsRe = regexp.MustCompile(`@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)`)
	// Matches !3d<lat>!4d<lng> tokens used by some share URLs.
	d3d4Re = regexp.MustCompile(`!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)`)
)

// parseMapsLink extracts place info from common Google Maps URL shapes:
//
//	https://www.google.com/maps/place/Cafe+Batavia/@-6.129,106.653,17z
//	https://www.google.com/maps/place/Cafe+Batavia
//	https://maps.google.com/?q=-6.129,106.653
//	https://maps.google.com/?q=Cafe+Batavia
//	https://www.google.com/maps/search/?api=1&query=...
//	https://www.google.com/maps/embed/v1/place?key=...&q=...
//
// Short goo.gl links must be resolved via followRedirect before parsing.
func parseMapsLink(raw string) (mapsLink, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return mapsLink{}, ErrUnsupportedLink
	}
	parsed, err := url.Parse(raw)
	if err != nil {
		return mapsLink{}, fmt.Errorf("location.parseMapsLink: %w", err)
	}

	host := strings.ToLower(parsed.Hostname())
	isGoogleHost := host == "google.com" ||
		strings.HasSuffix(host, ".google.com") ||
		host == "goo.gl" ||
		strings.HasSuffix(host, ".goo.gl")
	if !isGoogleHost {
		return mapsLink{}, ErrUnsupportedLink
	}

	link := mapsLink{
		Query: parsed.Query().Get("q"),
	}
	if link.Query == "" {
		link.Query = parsed.Query().Get("query")
	}

	// Human-readable label from /maps/place/<label>/...
	if m := placePathRe.FindStringSubmatch(parsed.Path); m != nil && strings.TrimSpace(m[1]) != "" {
		label, unescapeErr := url.PathUnescape(m[1])
		if unescapeErr == nil && strings.TrimSpace(label) != "" {
			// Path segments use "+" as an encoded space in Maps URLs.
			link.PlaceName = strings.TrimSpace(strings.ReplaceAll(label, "+", " "))
		}
	}

	// Prefer the exact place marker (!3d<lat>!4d<lng>) over the @lat,lng
	// viewport center: the latter is where the camera pointed when the link
	// was shared and can sit hundreds of meters from the actual pin. The
	// data segment lives in the path, so search path + query + fragment.
	if m := d3d4Re.FindStringSubmatch(parsed.Path + "&" + parsed.RawQuery + "&" + parsed.Fragment); m != nil {
		link.Lat = mustParseFloat(m[1])
		link.Lng = mustParseFloat(m[2])
		return normalizeQueryCoords(link), nil
	}

	// Fallback: viewport/camera coordinates after an @ sign.
	if m := atCoordsRe.FindStringSubmatch(parsed.Path); m != nil {
		link.Lat = mustParseFloat(m[1])
		link.Lng = mustParseFloat(m[2])
		return normalizeQueryCoords(link), nil
	}

	return normalizeQueryCoords(link), nil
}

// normalizeQueryCoords fills coordinates when the query itself is "lat,lng".
// Once coordinates are extracted, the query is cleared so it is not mistaken
// for a human-readable place name.
func normalizeQueryCoords(link mapsLink) mapsLink {
	if link.Lat == 0 && link.Lng == 0 && link.Query != "" {
		parts := strings.SplitN(link.Query, ",", 2)
		if len(parts) == 2 {
			lat, latErr := strconv.ParseFloat(strings.TrimSpace(parts[0]), 64)
			lng, lngErr := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)
			if latErr == nil && lngErr == nil {
				link.Lat = lat
				link.Lng = lng
				link.Query = ""
			}
		}
	}
	return link
}

func mustParseFloat(s string) float64 {
	v, _ := strconv.ParseFloat(s, 64)
	return v
}

const mapsLinkProvider = "google-maps-link"

// ResolveMapsLink turns a pasted Google Maps link into a Suggestion. Short
// goo.gl links are followed (redirect) to obtain the full URL. When only
// coordinates are available, reverse geocoding fills in name/address; when
// only a name is available, forward geocoding resolves coordinates.
func ResolveMapsLink(ctx context.Context, httpClient *http.Client, geoapify *GeoapifyClient, raw string) (Suggestion, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return Suggestion{}, ErrUnsupportedLink
	}

	// Follow short links (maps.app.goo.gl) to get the full URL.
	if isShortLink(raw) {
		fullURL, err := followRedirect(ctx, httpClient, raw)
		if err != nil {
			return Suggestion{}, err
		}
		raw = fullURL
	}

	link, err := parseMapsLink(raw)
	if err != nil {
		return Suggestion{}, err
	}

	name := link.PlaceName
	if name == "" {
		name = link.Query
	}
	// A "lat,lng" query is not a human-readable name.
	if name != "" && isCoordPair(name) {
		name = ""
	}

	// No coordinates → geocode the textual place name.
	if link.Lat == 0 && link.Lng == 0 {
		if name == "" {
			return Suggestion{}, ErrUnsupportedLink
		}
		items, err := geoapify.Autocomplete(ctx, name, "place", "en")
		if err != nil || len(items) == 0 {
			return Suggestion{}, ErrUnsupportedLink
		}
		first := items[0]
		first.Provider = mapsLinkProvider
		first.ExternalID = "gml:" + name
		first.SourceURL = raw
		return first, nil
	}

	suggestion := Suggestion{
		Provider:  mapsLinkProvider,
		Name:      name,
		Latitude:  link.Lat,
		Longitude: link.Lng,
		SourceURL: raw,
	}

	// Reverse geocode to fill address/country when possible. Failure here is
	// non-fatal — coordinates alone are still useful.
	addr, cc, ok := geoapify.ReverseGeocode(ctx, link.Lat, link.Lng)
	if ok {
		suggestion.Description = addr
		suggestion.CountryCode = cc
	}
	if suggestion.Description == "" {
		suggestion.Description = formatCoords(link.Lat, link.Lng)
	}
	if suggestion.Name == "" {
		suggestion.Name = suggestion.Description
	}
	suggestion.ExternalID = fmt.Sprintf("gml:%s,%s",
		strconv.FormatFloat(link.Lat, 'f', -1, 64),
		strconv.FormatFloat(link.Lng, 'f', -1, 64))
	return suggestion, nil
}

func isCoordPair(s string) bool {
	parts := strings.SplitN(s, ",", 2)
	if len(parts) != 2 {
		return false
	}
	_, err1 := strconv.ParseFloat(strings.TrimSpace(parts[0]), 64)
	_, err2 := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)
	return err1 == nil && err2 == nil
}

func formatCoords(lat, lng float64) string {
	return strconv.FormatFloat(lat, 'f', 6, 64) + ", " + strconv.FormatFloat(lng, 'f', 6, 64)
}

// isShortLink reports whether the URL is a goo.gl style short link that needs
// redirect resolution.
func isShortLink(raw string) bool {
	parsed, err := url.Parse(raw)
	if err != nil {
		return false
	}
	host := strings.ToLower(parsed.Hostname())
	return host == "goo.gl" || strings.HasSuffix(host, ".goo.gl")
}

const maxRedirects = 3

// followRedirect resolves a short link by following redirect responses. Only
// http(s) URLs are followed, and each hop must remain a google-owned host to
// avoid turning this into an open fetch primitive.
func followRedirect(ctx context.Context, httpClient *http.Client, raw string) (string, error) {
	current := raw
	for i := 0; i < maxRedirects; i++ {
		parsed, err := url.Parse(current)
		if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
			return "", ErrUnsupportedLink
		}
		host := strings.ToLower(parsed.Hostname())
		if !strings.HasSuffix(host, "google.com") && !strings.HasSuffix(host, "goo.gl") {
			return "", ErrUnsupportedLink
		}

		req, err := http.NewRequestWithContext(ctx, http.MethodHead, current, nil)
		if err != nil {
			return "", fmt.Errorf("location.followRedirect: %w", err)
		}
		resp, err := httpClient.Do(req)
		if err != nil {
			return "", fmt.Errorf("location.followRedirect: %w", err)
		}
		locationHeader := resp.Header.Get("Location")
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 1024))
		resp.Body.Close()

		if resp.StatusCode < 300 || resp.StatusCode >= 400 || locationHeader == "" {
			return current, nil
		}
		ref, err := url.Parse(locationHeader)
		if err != nil {
			return current, nil
		}
		current = parsed.ResolveReference(ref).String()
	}
	return current, nil
}

// ReverseGeocode asks Geoapify for an address at the given point. It returns
// ok=false when the provider is not configured or lookup fails — callers
// treat this as best-effort enrichment.
func (c *GeoapifyClient) ReverseGeocode(ctx context.Context, lat, lng float64) (address, countryCode string, ok bool) {
	if c.apiKey == "" {
		return "", "", false
	}
	// Same API family as autocomplete: .../v1/geocode/reverse.
	endpoint, err := url.Parse(strings.Replace(c.baseURL, "/autocomplete", "/reverse", 1))
	if err != nil {
		return "", "", false
	}
	params := endpoint.Query()
	params.Set("lat", strconv.FormatFloat(lat, 'f', -1, 64))
	params.Set("lon", strconv.FormatFloat(lng, 'f', -1, 64))
	params.Set("format", "json")
	params.Set("apiKey", c.apiKey)
	endpoint.RawQuery = params.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return "", "", false
	}
	req.Header.Set("Accept", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return "", "", false
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))
		return "", "", false
	}

	var payload struct {
		Results []struct {
			Formatted   string `json:"formatted"`
			CountryCode string `json:"country_code"`
		} `json:"results"`
	}
	decoder := json.NewDecoder(io.LimitReader(resp.Body, 1<<20))
	if err := decoder.Decode(&payload); err != nil || len(payload.Results) == 0 {
		return "", "", false
	}
	first := payload.Results[0]
	if first.Formatted == "" {
		return "", "", false
	}
	return first.Formatted, strings.ToUpper(first.CountryCode), true
}
