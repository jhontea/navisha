import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  IDR: "Rp",
  USD: "$",
  JPY: "¥",
  SGD: "S$",
  KRW: "₩",
}

export function formatCurrency(amount: number, currency: string, compact = false): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency
  // Round to whole number — no cents needed for travel budget display
  const rounded = Math.round(amount)
  return `${symbol} ${rounded.toLocaleString()}`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function formatDateRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  const diffMs = e.getTime() - s.getTime()
  const nights = Math.round(diffMs / (1000 * 60 * 60 * 24))
  return `${formatDate(start)} – ${formatDate(end)} · ${nights} night${nights !== 1 ? "s" : ""}`
}
