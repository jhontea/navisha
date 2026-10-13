import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatMoney } from "./money"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


/** @deprecated alias of formatMoney (lib/money.ts); kept for existing call sites. */
export function formatCurrency(amount: number, currency: string): string {
  return formatMoney(amount, currency)
}


export function formatDate(dateStr: string): string {
  // Append T00:00:00 so bare YYYY-MM-DD strings are parsed as local time,
  // not UTC midnight (which shifts the date back 1 day in UTC+7).
  const normalized = dateStr.includes("T") ? dateStr : dateStr + "T00:00:00"
  return new Date(normalized).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/**
 * Short date without the year (e.g. "12 Aug") — used in compact contexts
 * such as the TripCard bottom row on mobile.
 */
export function formatDateShort(dateStr: string): string {
  const normalized = dateStr.includes("T") ? dateStr : dateStr + "T00:00:00"
  return new Date(normalized).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })
}

export function formatDateRange(start: string, end: string): string {
  const s = new Date(start.includes("T") ? start : start + "T00:00:00")
  const e = new Date(end.includes("T") ? end : end + "T00:00:00")
  const diffMs = e.getTime() - s.getTime()
  const nights = Math.round(diffMs / (1000 * 60 * 60 * 24))
  return `${formatDate(start)} – ${formatDate(end)} · ${nights} night${nights !== 1 ? "s" : ""}`
}
