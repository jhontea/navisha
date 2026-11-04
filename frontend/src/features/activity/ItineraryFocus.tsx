"use client"

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useMemo,
  useOptimistic,
  useState,
  type ReactNode,
} from "react"

/**
 * Shared focus between the itinerary timeline and the side map (desktop):
 * which day the map shows, and which activity is highlighted on both.
 */
type ItineraryFocus = {
  activeDayId: string | null
  /** The day the picker marks: the new day at once, while the panel's transition runs. */
  pickedDayId: string | null
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
  const [activeDayId, setActiveDay] = useState<string | null>(initialDayId)
  const [pickedDayId, setPickedDay] = useOptimistic(activeDayId)
  // A Transition, so <ViewTransition> crossfades the day panel (DESIGN.md §6) for every caller.
  // React queues it behind a running crossfade, so the picker takes the optimistic day.
  const setActiveDayId = useCallback(
    (dayId: string) =>
      startTransition(() => {
        setPickedDay(dayId)
        setActiveDay(dayId)
      }),
    [setPickedDay],
  )
  const [selectedActivityId, selectActivity] = useState<string | null>(null)

  const value = useMemo(
    () => ({ activeDayId, pickedDayId, setActiveDayId, selectedActivityId, selectActivity }),
    [activeDayId, pickedDayId, setActiveDayId, selectedActivityId],
  )
  return <ItineraryFocusContext.Provider value={value}>{children}</ItineraryFocusContext.Provider>
}

/** Focus state, or a no-op fallback when rendered outside the itinerary page. */
export function useItineraryFocus(): ItineraryFocus {
  return (
    useContext(ItineraryFocusContext) ?? {
      activeDayId: null,
      pickedDayId: null,
      setActiveDayId: () => {},
      selectedActivityId: null,
      selectActivity: () => {},
    }
  )
}
