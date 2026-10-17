import type { BudgetBreakdown, TripDraft } from "../types"
import { suggestionKey } from "./suggestionKey"

/** Selection key of the i-th transport leg in DraftPreview. */
export const legKey = (i: number) => `leg:${i}`
/** Selection key of the i-th stay in DraftPreview. */
export const stayKey = (i: number) => `stay:${i}`

/** Every selectable key of a draft: activities, legs and stays. */
export function draftKeys(draft: TripDraft): string[] {
  return [
    ...draft.days.flatMap((d) => d.activities.map(suggestionKey)),
    ...(draft.transport_legs ?? []).map((_, i) => legKey(i)),
    ...(draft.lodging ?? []).map((_, i) => stayKey(i)),
  ]
}

/**
 * Keeps only what the user selected. Days stay (the trip needs every date);
 * the budget plan is kept as generated, it is an estimate the user edits on
 * the budget page.
 */
export function curateDraft(draft: TripDraft, selected: Set<string>): TripDraft {
  return {
    ...draft,
    days: draft.days.map((d) => ({
      ...d,
      activities: d.activities.filter((a) => selected.has(suggestionKey(a))),
    })),
    transport_legs: (draft.transport_legs ?? []).filter((_, i) => selected.has(legKey(i))),
    lodging: (draft.lodging ?? []).filter((_, i) => selected.has(stayKey(i))),
  }
}

const BUDGET_LABELS: { key: keyof BudgetBreakdown; label: string }[] = [
  { key: "transport", label: "Transport" },
  { key: "accommodation", label: "Stay" },
  { key: "food", label: "Food" },
  { key: "activity", label: "Activities" },
  { key: "other", label: "Other" },
]

/** Non-zero budget categories in display order. */
export function budgetRows(b: BudgetBreakdown | undefined): { label: string; amount: number }[] {
  if (!b) return []
  return BUDGET_LABELS.filter(({ key }) => b[key] > 0).map(({ key, label }) => ({ label, amount: b[key] }))
}

/** Nights between check-in and check-out dates (YYYY-MM-DD). */
export function nights(checkIn: string, checkOut: string): number {
  const ms = Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)
  return Number.isFinite(ms) && ms > 0 ? Math.round(ms / 86400000) : 0
}
