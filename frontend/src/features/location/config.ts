import type { LocationProviderName } from "./types"

const configuredProvider = process.env.NEXT_PUBLIC_LOCATION_PROVIDER

export const LOCATION_PROVIDER: LocationProviderName =
  configuredProvider === "google" ? "google" : "geoapify"

const configuredMapProvider = process.env.NEXT_PUBLIC_MAP_PROVIDER

export type MapProviderName = "maplibre" | "google" | "disabled"

export const MAP_PROVIDER: MapProviderName =
  configuredMapProvider === "google" || configuredMapProvider === "disabled"
    ? configuredMapProvider
    : "maplibre"
