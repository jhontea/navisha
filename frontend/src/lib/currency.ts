// Supported currencies — single source of truth for dropdowns and labels.
// Backend is authoritative; this is a frontend fallback when the API is unavailable.

export const SUPPORTED_CURRENCIES = [
  "IDR", "USD", "JPY", "SGD", "KRW",
  "MYR", "THB", "EUR", "VND", "SAR",
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
  SAR: "Saudi Riyal",
}

// Display symbol per currency. Regional-indicator flag emoji are not used:
// Windows renders them as two letters ("US", "ID").
export const CURRENCY_SYMBOLS: Record<string, string> = {
  IDR: "Rp",
  USD: "$",
  JPY: "¥",
  SGD: "S$",
  KRW: "₩",
  EUR: "€",
  MYR: "RM",
  THB: "฿",
  VND: "₫",
  SAR: "SAR",
}

/** Returns the display symbol for a currency, or the code itself if unknown. */
export function getCurrencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code?.toUpperCase()] ?? code
}

/** Returns "CODE - Full Name" label. Falls back to code-only if unknown. */
export function getCurrencyLabel(code: string, apiName?: string): string {
  const name = apiName || CURRENCY_NAMES[code] || code
  return `${code} - ${name}`
}
