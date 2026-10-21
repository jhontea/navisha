export function getInclusiveDayCount(startDate: string, endDate: string) {
  const start = parseISODateParts(startDate)
  const end = parseISODateParts(endDate)
  if (!start || !end) return null

  const startUTC = Date.UTC(start.year, start.month - 1, start.day)
  const endUTC = Date.UTC(end.year, end.month - 1, end.day)
  if (endUTC < startUTC) return null
  return Math.floor((endUTC - startUTC) / 86_400_000) + 1
}

/**
 * "Fri 20 – Mon 23 Nov", "Fri 30 Oct – Sun 1 Nov"; years only when the range
 * crosses one ("Wed 30 Dec 2026 – Fri 1 Jan 2027"). Empty for bad dates.
 */
export function formatFriendlyRange(startDate: string, endDate: string) {
  const start = parseISODateParts(startDate)
  const end = parseISODateParts(endDate)
  if (!start || !end) return ""

  const fmt = (p: NonNullable<typeof start>, opts: Intl.DateTimeFormatOptions) =>
    new Date(Date.UTC(p.year, p.month - 1, p.day))
      .toLocaleDateString("en-GB", { timeZone: "UTC", ...opts })
      .replace(",", "")
  const day = { weekday: "short", day: "numeric" } as const
  const full = { ...day, month: "short" } as const

  if (startDate === endDate) return fmt(start, full)
  if (start.year !== end.year) {
    return `${fmt(start, { ...full, year: "numeric" })} – ${fmt(end, { ...full, year: "numeric" })}`
  }
  if (start.month !== end.month) return `${fmt(start, full)} – ${fmt(end, full)}`
  return `${fmt(start, day)} – ${fmt(end, full)}`
}

function parseISODateParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}
