export interface PlaceLabel {
  /** Airport or station code when the location names one, e.g. "CGK". */
  code: string | null
  /** Short place name for the big label when there is no code. */
  name: string
  /** Second line: city or the rest of the address. */
  detail: string | null
}

const CODE_IN_PARENS = /\(([A-Z]{3,4})\)/

/**
 * Splits a free-text transport location for the boarding pass.
 * "Bandara Soekarno-Hatta (CGK), Jakarta" -> { code: "CGK", name: "Bandara Soekarno-Hatta", detail: "Jakarta" }
 * "Stasiun Haramain Madinah" -> { code: null, name: "Stasiun Haramain Madinah", detail: null }
 */
export function parsePlace(location?: string | null): PlaceLabel | null {
  const text = location?.trim()
  if (!text) return null

  const code = CODE_IN_PARENS.exec(text)?.[1] ?? null
  const [head, ...rest] = text.split(",").map((part) => part.trim()).filter(Boolean)
  const name = (head ?? text).replace(CODE_IN_PARENS, "").replace(/\s{2,}/g, " ").trim() || text
  const detail = rest.length > 0 ? rest.join(", ") : null

  return { code, name, detail }
}
