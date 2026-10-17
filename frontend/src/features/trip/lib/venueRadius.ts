import type { TripDraft } from "../types"

/** Where the trip's main event is, as given in the generate wizard. */
export interface VenueAnchor {
  lat: number
  lng: number
  /** Event date, YYYY-MM-DD. */
  date: string
}

/** Places this far from the venue, while the trip is staying there, need a check. */
export const VENUE_RADIUS_KM = 5

/**
 * Marks pinned places that are far from the event venue as needs_review
 * (they are kept: dropping them would leave holes in the day). Only the time
 * spent around the venue is checked: the event day and the nights of a stay,
 * after the trip's first leg arrives and before its last leg leaves, so a
 * rest-area stop on the drive is not flagged.
 */
export function flagFarFromVenue(draft: TripDraft, venue: VenueAnchor | null | undefined): TripDraft {
  if (!venue) return draft
  const dates = venueDates(draft, venue.date)
  const legs = draft.transport_legs ?? []
  const outbound = legs.length > 1 ? legs[0] : undefined
  const inbound = legs.length > 1 ? legs[legs.length - 1] : undefined

  return {
    ...draft,
    days: draft.days.map((day) => {
      if (!dates.has(day.date)) return day
      const after = outbound?.arrival_date === day.date ? outbound.arrival_time : ""
      const before = inbound?.departure_date === day.date ? inbound.departure_time : ""
      return {
        ...day,
        activities: day.activities.map((act) => {
          if (act.type !== "location" || act.lat == null || act.lng == null) return act
          if (after && act.start_time && act.start_time < after) return act
          if (before && act.start_time && act.start_time >= before) return act
          if (distanceKm(venue, { lat: act.lat, lng: act.lng }) <= VENUE_RADIUS_KM) return act
          return { ...act, location_verification: "needs_review" as const }
        }),
      }
    }),
  }
}

/** The event date plus every date of a stay (check-in through check-out). */
function venueDates(draft: TripDraft, eventDate: string): Set<string> {
  const dates = new Set([eventDate])
  for (const stay of draft.lodging ?? []) {
    for (const day of draft.days) {
      if (day.date >= stay.check_in_date && day.date <= stay.check_out_date) dates.add(day.date)
    }
  }
  return dates
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}
