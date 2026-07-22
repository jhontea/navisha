function timeToMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

export function addMinutesToTime(time: string, duration: number): string | null {
  const start = timeToMinutes(time)
  if (start === null || start + duration >= 24 * 60) return null

  const end = start + duration
  return `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`
}

export function getDurationMinutes(
  startTime: string,
  endTime: string,
): number | null {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  if (start === null || end === null || end <= start) return null
  return end - start
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (!hours) return `${remainder}m`
  if (!remainder) return `${hours}h`
  return `${hours}h ${remainder}m`
}

export function formatActivityTimeRange(
  startTime?: string,
  endTime?: string,
): string | null {
  if (!startTime) return null
  if (!endTime) return startTime

  const duration = getDurationMinutes(startTime, endTime)
  const range = `${startTime}–${endTime}`
  return duration === null ? range : `${range} · ${formatDuration(duration)}`
}
