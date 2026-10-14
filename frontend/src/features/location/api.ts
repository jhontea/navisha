import { api } from "@/lib/api"
import type {
  LocationSearchKind,
  LocationSuggestionsResponse,
  BatchLocationSuggestionsResponse,
  MapsLinkResponse,
} from "./types"

export function searchLocationSuggestions(
  query: string,
  kind: LocationSearchKind,
  signal?: AbortSignal,
) {
  return api.get<LocationSuggestionsResponse>("/locations/autocomplete", {
    params: { query, kind, lang: "en" },
    signal,
  })
}

export function resolveLocationSuggestions(
  items: Array<{ key: string; name: string; alt_name?: string; city?: string }>,
  destination: string,
  signal?: AbortSignal,
) {
  return api.post<BatchLocationSuggestionsResponse>(
    "/locations/resolve",
    { items, destination },
    { signal },
  )
}

export function resolveMapsLink(url: string, signal?: AbortSignal) {
  return api.post<MapsLinkResponse>("/locations/link", { url }, { signal })
}
