const ALLOWED_PROTOCOLS = new Set(["http:", "https:"])

export function normalizeExternalUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  try {
    const parsed = new URL(candidate)
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol) || !parsed.hostname) return null
    return parsed.toString()
  } catch {
    return null
  }
}
