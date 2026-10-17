// Shared look of map pins for both renderers (MapLibre DOM markers, Google
// AdvancedMarker content): a name pill above a numbered circle, stays as a
// rounded square "H". Soft palette (docs/DESIGN.md §2); markers are styled
// inline, so the token values are mirrored here.

export const INK = "#23324D"
export const PRIMARY = "#3673DB"
export const STAY = "#0E2B53"

/** Show a name label above each pin while the view stays readable. */
export const MAX_LABELLED_POINTS = 10

/** Diameter of the numbered circle; its centre sits on the coordinate. */
export const PIN_SIZE = 30

export const PIN_SHADOW = "0 2px 8px rgb(35 50 77 / 0.3)"
export const PIN_SELECTED_SHADOW = `0 0 0 4px ${PRIMARY}59, 0 4px 12px rgb(35 50 77 / 0.35)`
export const LABEL_SHADOW = "0 2px 8px rgb(35 50 77 / 0.18)"

export function shortLabel(title: string): string {
  return title.length > 22 ? `${title.slice(0, 21).trimEnd()}…` : title
}
