export type TripStatus = "upcoming" | "active" | "past"

const MS_PER_DAY = 86_400_000

export type TripDateMetrics = {
  status: TripStatus
  totalDays: number
  currentDay: number
  percent: number
  daysUntilStart: number
  started: boolean
}

// Format a Date using the user's local calendar date. `toISOString()` cannot
// be used here because it switches to UTC and can return yesterday/tomorrow.
export function toLocalISODate(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Convert YYYY-MM-DD to a timezone-neutral calendar-day number.
function calendarDay(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return Number.NaN
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / MS_PER_DAY
}

export function getTripDateMetrics(
  startDate: string,
  endDate: string,
  today = new Date(),
): TripDateMetrics {
  const start = calendarDay(startDate)
  const end = calendarDay(endDate)
  const current = calendarDay(toLocalISODate(today))

  if (![start, end, current].every(Number.isFinite)) {
    return {
      status: "upcoming",
      totalDays: 1,
      currentDay: 0,
      percent: 0,
      daysUntilStart: 0,
      started: false,
    }
  }

  const totalDays = Math.max(1, end - start + 1)
  const daysUntilStart = start - current

  if (current < start) {
    return {
      status: "upcoming",
      totalDays,
      currentDay: 0,
      percent: 0,
      daysUntilStart,
      started: false,
    }
  }

  if (current > end) {
    return {
      status: "past",
      totalDays,
      currentDay: totalDays,
      percent: 100,
      daysUntilStart,
      started: true,
    }
  }

  const currentDay = Math.min(current - start + 1, totalDays)
  return {
    status: "active",
    totalDays,
    currentDay,
    percent: Math.min(100, Math.round((currentDay / totalDays) * 100)),
    daysUntilStart,
    started: true,
  }
}

// Date strings are compared as calendar dates, independent of time and timezone.
export function tripStatus(startDate: string, endDate: string): TripStatus {
  return getTripDateMetrics(startDate, endDate).status
}

export const STATUS_LABEL: Record<TripStatus, string> = {
  upcoming: "Upcoming",
  active: "Active",
  past: "Past",
}
