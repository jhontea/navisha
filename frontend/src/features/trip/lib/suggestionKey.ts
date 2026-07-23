import type { ActivityDraft } from "../types"

// Stable identity key for an activity draft. Used to track selection state
// across DraftPreview (full-draft curation) and DayAIPlanner (per-day curation).
// Combines the fields that make a suggestion unique within a single generation.
export function suggestionKey(activity: ActivityDraft): string {
  return [activity.title, activity.start_time, activity.end_time, activity.location_name].join("|")
}
