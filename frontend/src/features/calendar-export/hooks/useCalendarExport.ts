"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { calendarExportApi } from "../api"

const statusKey = (tripId: string) => ["calendar-export", "status", tripId]

// Reports how many events are currently exported for this trip. Drives whether
// the Remove action is shown.
export function useCalendarExportStatus(tripId: string) {
  return useQuery({
    queryKey: statusKey(tripId),
    queryFn: () => calendarExportApi.status(tripId),
  })
}

// Syncs the trip's location activities to the user's Google Calendar (adds new,
// prunes removed). Refreshes the status on success.
export function useExportToCalendar(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => calendarExportApi.export(tripId),
    onSuccess: () => qc.invalidateQueries({ queryKey: statusKey(tripId) }),
  })
}

// Removes the trip's exported events from Google Calendar.
export function useRemoveFromCalendar(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => calendarExportApi.remove(tripId),
    onSuccess: () => qc.invalidateQueries({ queryKey: statusKey(tripId) }),
  })
}
