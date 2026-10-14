import { LOCATION_PROVIDER } from "../config"
import { geoapifyLocationProvider } from "./geoapify"
import { googleLocationProvider } from "./google"
import type { LocationProvider } from "./types"

/** The configured place search service (NEXT_PUBLIC_LOCATION_PROVIDER, default geoapify). */
export const locationProvider: LocationProvider =
  LOCATION_PROVIDER === "google" ? googleLocationProvider : geoapifyLocationProvider

export type {
  DestinationData,
  DestinationSearchProps,
  LocationProvider,
  PlaceData,
  PlaceQuery,
  PlaceSearchProps,
} from "./types"
