// Supported currencies — single source of truth for dropdowns and labels.
// Backend is authoritative; this is a frontend fallback when the API is unavailable.

export const SUPPORTED_CURRENCIES = [
  "IDR", "USD", "JPY", "SGD", "KRW",
  "MYR", "THB", "EUR", "VND",
] as const

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]

export const CURRENCY_NAMES: Record<string, string> = {
  IDR: "Indonesian Rupiah",
  USD: "US Dollar",
  JPY: "Japanese Yen",
  SGD: "Singapore Dollar",
  KRW: "South Korean Won",
  MYR: "Malaysian Ringgit",
  THB: "Thai Baht",
  EUR: "Euro",
  VND: "Vietnamese Dong",
}

// ISO 4217 currency code → ISO 3166-1 alpha-2 country code.
// Used to render the correct regional flag emoji. EUR maps to the EU flag.
export const CURRENCY_COUNTRY: Record<string, string> = {
  IDR: "ID",
  USD: "US",
  JPY: "JP",
  SGD: "SG",
  KRW: "KR",
  MYR: "MY",
  THB: "TH",
  EUR: "EU",
  VND: "VN",
}

/**
 * Returns the regional flag emoji for a currency code (e.g. "USD" → "🇺🇸").
 * Converts a 2-letter country code into its flag emoji using regional
 * indicator symbols. Returns 🏳️ (white flag) as a fallback for unknown codes.
 */
export function getCurrencyFlag(code: string): string {
  const cc = CURRENCY_COUNTRY[code?.toUpperCase()]
  if (!cc || cc.length !== 2) return "🏳️"
  // Regional indicator symbol letters A-Z start at U+1F1E6.
  const A = 0x1f1e6
  const base = "A".charCodeAt(0)
  return String.fromCodePoint(
    A + (cc.charCodeAt(0) - base),
    A + (cc.charCodeAt(1) - base),
  )
}

/** Returns "CODE - Full Name" label. Falls back to code-only if unknown. */
export function getCurrencyLabel(code: string, apiName?: string): string {
  const name = apiName || CURRENCY_NAMES[code] || code
  return `${code} - ${name}`
}
