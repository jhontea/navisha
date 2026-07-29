export const DAY_COLORS = [
  "#2563eb",
  "#0891b2",
  "#7c3aed",
  "#0d9488",
  "#3b82f6",
  "#06b6d4",
  "#8b5cf6",
  "#14b8a6",
] as const

export const colorForDay = (dayNumber: number) =>
  DAY_COLORS[(dayNumber - 1) % DAY_COLORS.length]
