export type TripStatus = "upcoming" | "active" | "past"

// Date strings expected as YYYY-MM-DD. Local-date comparison; ignore time-of-day.
export function tripStatus(startDate: string, endDate: string): TripStatus {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(startDate)
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)
  if (today < start) return "upcoming"
  if (today > end) return "past"
  return "active"
}

export const STATUS_LABEL: Record<TripStatus, string> = {
  upcoming: "Upcoming",
  active: "Active",
  past: "Past",
}
