import { api } from "@/lib/api"
import type {
  LocationSearchKind,
  LocationSuggestionsResponse,
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
