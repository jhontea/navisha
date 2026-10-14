export interface TripSummary {
  id: string
  trip_id: string
  content: string
  model: string
  source_updated_at: string
  is_outdated: boolean
  created_at: string
  updated_at: string
}

/** Language the AI summary is written in. */
export type SummaryLanguage = "id" | "en"
