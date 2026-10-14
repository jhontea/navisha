/**
 * Splits a trip title for the two-tone heading (docs/DESIGN.md §3): the part
 * after the first ":" or " – " / " - " is shown muted.
 * "Dream Tour Umrah 9 Hari: Makkah lalu Madinah" -> ["Dream Tour Umrah 9 Hari", "Makkah lalu Madinah"]
 */
export function splitTripTitle(title: string): { main: string; rest: string | null } {
  const text = title.trim()
  const m = /^(.+?)(?::\s+|\s+[–—-]\s+)(.+)$/.exec(text)
  if (!m) return { main: text, rest: null }
  return { main: m[1].trim(), rest: m[2].trim() }
}
