import { getCurrencySymbol } from "./currency"

// Currencies whose amounts are written without minor units (no "cents").
const ZERO_DECIMAL = new Set(["IDR", "JPY", "KRW", "VND"])

/** Number of decimals shown for a currency: 0 for IDR/JPY/KRW/VND, else 2. */
export function currencyDecimals(currency: string): number {
  return ZERO_DECIMAL.has(currency?.toUpperCase()) ? 0 : 2
}

/**
 * Formats an amount for display: symbol + grouped number, with the decimals
 * the currency actually uses. "Rp 68,340,304", "$12.50", "-¥1,200".
 * Uses en-US grouping to match the English UI.
 */
export function formatMoney(amount: number, currency: string): string {
  const decimals = currencyDecimals(currency)
  const value = Number.isFinite(amount) ? amount : 0
  const rounded = Number(value.toFixed(decimals))
  const formatted = Math.abs(rounded).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  const sign = rounded < 0 ? "-" : ""
  return `${sign}${getCurrencySymbol(currency)} ${formatted}`
}
