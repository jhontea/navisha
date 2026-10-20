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

/**
 * Live-typing format for amount inputs: digits plus one ".", fraction cut to
 * `decimals` (0 drops the dot), en-US grouping, "" when empty. "1500.756" with
 * 2 decimals -> "1,500.75"; "10." keeps its dot so the user can keep typing.
 */
export function formatAmountInput(raw: string, decimals = 0): string {
  const [intRaw, ...rest] = raw.replace(/[^0-9.]/g, "").split(".")
  // Several dots are always thousands separators ("1.500.000"); a lone dot is one only
  // for whole-number currencies when exactly 3 digits follow ("1.500"), else a fraction.
  const dotsAreGrouping = rest.length > 1 || (decimals === 0 && rest[0]?.length === 3)
  const whole = dotsAreGrouping ? intRaw + rest.join("") : intRaw
  const fraction = decimals > 0 && !dotsAreGrouping ? rest.join("").slice(0, decimals) : ""
  const int = whole.replace(/^0+(?=\d)/, "")
  if (!int && (decimals === 0 || !rest.length)) return ""
  const grouped = (int || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return decimals > 0 && rest.length && !dotsAreGrouping ? `${grouped}.${fraction}` : grouped
}

/**
 * Prefill text for a stored amount: rounded to the currency decimals and padded
 * like formatMoney ("1,235", "12.50"). No typing heuristics, so a stored
 * 123456.789 IDR can never be misread as 123,456,789.
 */
export function formatAmountValue(amount: number, decimals: number): string {
  return Number.isFinite(amount)
    ? amount.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : ""
}

/** Inverse of formatAmountInput: "1,500.50" -> "1500.50" (feed it to Number()). */
export function unformatAmountInput(formatted: string): string {
  return formatted.replace(/,/g, "")
}
