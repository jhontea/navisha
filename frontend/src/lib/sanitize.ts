/**
 * HTML sanitization utilities for user-generated content.
 *
 * All user-provided text (trip titles, descriptions, notes, activity names,
 * accommodation names, etc.) should be sanitized before rendering to prevent
 * XSS attacks even though React auto-escapes JSX text content.
 *
 * This provides defense-in-depth for edge cases:
 * - Text used in HTML attributes (title, alt, aria-label)
 * - Text rendered by third-party libraries that may use dangerouslySetInnerHTML
 * - Text exported to other formats (PDF, calendar)
 */

const HTML_TAG_RE = /<[^>]*>/g
const HTML_ENTITY_RE = /&[#\w]+;/g

/**
 * Strips all HTML tags and decodes common HTML entities from a string.
 * Returns an empty string for null/undefined input.
 */
export function sanitizeText(input: string | null | undefined): string {
  if (input == null) return ""
  return input
    .replace(HTML_TAG_RE, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(HTML_ENTITY_RE, "") // strip any remaining encoded entities
    .trim()
}

/**
 * Truncates text to maxLength characters, appending "…" if truncated.
 * Safe for use in HTML attributes.
 */
export function truncateText(input: string | null | undefined, maxLength: number): string {
  const cleaned = sanitizeText(input)
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.slice(0, maxLength) + "…"
}

/**
 * Returns a safe string for use in HTML title/alt/aria-label attributes.
 * Strips HTML tags and limits length to prevent attribute-based injection.
 */
export function safeAttr(input: string | null | undefined, maxLength = 200): string {
  const cleaned = sanitizeText(input)
  // Strip quotes that could break out of attribute values
  return cleaned.replace(/["']/g, "").slice(0, maxLength)
}
