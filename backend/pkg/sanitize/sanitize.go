// Package sanitize provides input sanitization functions for user-generated
// content. Strips HTML tags to prevent stored XSS in case frontend rendering
// bypasses React's auto-escaping (e.g., dangerouslySetInnerHTML, markdown
// renderers, calendar exports, or third-party integrations).
package sanitize

import (
	"regexp"
	"strings"
)

var htmlTagRe = regexp.MustCompile(`<[^>]*>`)
var htmlEntityRe = regexp.MustCompile(`&[#\w]{2,8};`)
var multiSpaceRe = regexp.MustCompile(`\s{2,}`)

// Text strips HTML tags and entities from user-provided text.
// Collapses multiple spaces into one. Never returns nil — empty input yields "".
func Text(s string) string {
	if s == "" {
		return s
	}
	cleaned := htmlTagRe.ReplaceAllString(s, "")
	cleaned = htmlEntityRe.ReplaceAllString(cleaned, "")
	cleaned = multiSpaceRe.ReplaceAllString(cleaned, " ")
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
