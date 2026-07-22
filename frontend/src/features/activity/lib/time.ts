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

interface SchedulableActivity {
  id: string
  title: string
  start_time?: string
  end_time?: string
}

export function findActivityOverlaps(
  activities: SchedulableActivity[],
): Map<string, string[]> {
  const ranges = activities.flatMap((activity) => {
    const start = timeToMinutes(activity.start_time ?? "")
    const end = timeToMinutes(activity.end_time ?? "")
    return start !== null && end !== null && end > start
      ? [{ activity, start, end }]
      : []
  })
  const overlaps = new Map<string, string[]>()

  const addOverlap = (activityId: string, otherTitle: string) => {
    const titles = overlaps.get(activityId) ?? []
    if (!titles.includes(otherTitle)) titles.push(otherTitle)
    overlaps.set(activityId, titles)
  }

  for (let index = 0; index < ranges.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < ranges.length; otherIndex += 1) {
      const current = ranges[index]
      const other = ranges[otherIndex]
      const hasOverlap = current.start < other.end && other.start < current.end
      if (!hasOverlap) continue

      addOverlap(current.activity.id, other.activity.title)
      addOverlap(other.activity.id, current.activity.title)
    }
  }

  return overlaps
}
