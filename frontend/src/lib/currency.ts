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

/** Returns "CODE - Full Name" label. Falls back to code-only if unknown. */
export function getCurrencyLabel(code: string, apiName?: string): string {
  const name = apiName || CURRENCY_NAMES[code] || code
  return `${code} - ${name}`
}
