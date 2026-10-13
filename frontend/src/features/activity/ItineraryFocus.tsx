"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

/**
 * Shared focus between the itinerary timeline and the side map (desktop):
 * which day the map shows, and which activity is highlighted on both.
 */
type ItineraryFocus = {
  activeDayId: string | null
  setActiveDayId: (dayId: string) => void
  selectedActivityId: string | null
  selectActivity: (activityId: string | null) => void
}

const ItineraryFocusContext = createContext<ItineraryFocus | null>(null)

export function ItineraryFocusProvider({
  initialDayId,
  children,
}: {
  initialDayId: string | null
  children: ReactNode
}) {
  const [activeDayId, setActiveDayId] = useState<string | null>(initialDayId)
  const [selectedActivityId, selectActivity] = useState<string | null>(null)

  const value = useMemo(
    () => ({ activeDayId, setActiveDayId, selectedActivityId, selectActivity }),
    [activeDayId, selectedActivityId],
  )
  return <ItineraryFocusContext.Provider value={value}>{children}</ItineraryFocusContext.Provider>
}

/** Focus state, or a no-op fallback when rendered outside the itinerary page. */
export function useItineraryFocus(): ItineraryFocus {
  return (
    useContext(ItineraryFocusContext) ?? {
      activeDayId: null,
      setActiveDayId: () => {},
      selectedActivityId: null,
      selectActivity: () => {},
    }
  )
}
