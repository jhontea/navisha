export function getInclusiveDayCount(startDate: string, endDate: string) {
  const start = parseISODateParts(startDate)
  const end = parseISODateParts(endDate)
  if (!start || !end) return null

  const startUTC = Date.UTC(start.year, start.month - 1, start.day)
  const endUTC = Date.UTC(end.year, end.month - 1, end.day)
  if (endUTC < startUTC) return null
  return Math.floor((endUTC - startUTC) / 86_400_000) + 1
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
