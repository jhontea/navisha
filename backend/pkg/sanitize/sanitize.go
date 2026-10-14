// Package sanitize provides input sanitization functions for user-generated
// content. Strips HTML tags to prevent stored XSS in case frontend rendering
// bypasses React's auto-escaping (e.g., dangerouslySetInnerHTML, markdown
// renderers, calendar exports, or third-party integrations).
package sanitize

import (
	"regexp"
	"strings"
	"unicode/utf8"
)

var htmlTagRe = regexp.MustCompile(`<[^>]*>`)
var htmlEntityRe = regexp.MustCompile(`&[#\w]{2,8};`)

// Runs of spaces/tabs collapse to one space; line breaks are kept so
// multi-paragraph notes survive, but more than one blank line collapses to one.
var multiSpaceRe = regexp.MustCompile(`[ \t\f\v]{2,}`)
var trailingSpaceRe = regexp.MustCompile(`[ \t]+\n`)
var manyNewlinesRe = regexp.MustCompile(`\n{3,}`)

// Text strips HTML tags and entities from user-provided text.
// Collapses repeated spaces and blank lines. Never returns nil — empty input yields "".
func Text(s string) string {
	if s == "" {
		return s
	}
	cleaned := htmlTagRe.ReplaceAllString(s, "")
	cleaned = htmlEntityRe.ReplaceAllString(cleaned, "")
	cleaned = strings.ReplaceAll(cleaned, "\r\n", "\n")
	cleaned = multiSpaceRe.ReplaceAllString(cleaned, " ")
	cleaned = trailingSpaceRe.ReplaceAllString(cleaned, "\n")
	cleaned = manyNewlinesRe.ReplaceAllString(cleaned, "\n\n")
	return strings.TrimSpace(cleaned)
}

// Optional sanitizes a string pointer in-place. If the pointer is nil or the
// string is empty, no action is taken.
func Optional(s *string) {
	if s == nil || *s == "" {
		return
	}
	*s = Text(*s)
}

// TooLong reports whether s has more than max characters. Limits count
// characters, not bytes, so Japanese or emoji text gets the same room.
func TooLong(s string, max int) bool {
	return utf8.RuneCountInString(s) > max
}
