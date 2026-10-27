"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { bookingImportApi } from "../api"

/** Reads bookings from pasted confirmation text. Nothing is saved; the text lives only in this mutation. */
export function useParseBookings(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (text: string) => bookingImportApi.parse(tripId, text),
    // Parsing uses the shared AI daily quota (refunded on failure), so refresh the badge either way.
    onSettled: () => qc.invalidateQueries({ queryKey: ["autogen", "quota"] }),
    retry: 0,
  })
}
