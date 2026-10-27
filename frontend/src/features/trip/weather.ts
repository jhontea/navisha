"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { inForecastRange } from "./lib/weather"

export interface TripWeatherDay {
  date: string // YYYY-MM-DD
  weather_code: number // WMO
  temp_min: number // °C
  temp_max: number
}

export const tripWeatherKey = (tripId: string) => ["trips", "weather", tripId] as const

export const tripWeatherApi = {
  get: (tripId: string, signal?: AbortSignal) =>
    api.get<{ days: TripWeatherDay[] }>(`/trips/${tripId}/weather`, { signal }),
}

/** Daily forecast for the trip's days within range; only fetched when the trip can overlap it. */
export function useTripWeather(tripId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: tripWeatherKey(tripId),
    queryFn: ({ signal }) => tripWeatherApi.get(tripId, signal),
    enabled: Boolean(tripId) && inForecastRange(startDate, endDate),
    staleTime: 60 * 60 * 1000,
    // Weather is decorative: a failure just hides the chip.
    retry: false,
  })
}
