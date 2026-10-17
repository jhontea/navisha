"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps"

import { Input } from "@/components/ui/input"
import { pickForDetails, type PlaceCandidate } from "../placeMatching"
import type { DestinationSearchProps, LocationProvider, PlaceQuery, PlaceSearchProps } from "./types"

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""
const BOUND_KM = 50
const DEG_LAT_PER_KM = 1 / 111.32

// ── Search fields ───────────────────────────────────────────────────────────

function Boundary({ children }: { children: ReactNode }) {
  return (
    <APIProvider apiKey={API_KEY} libraries={["places"]}>
      {children}
    </APIProvider>
  )
}

// The legacy Autocomplete widget needs the `places` library; vis.gl dedupes
// the script load across instances by key.
function PlaceSearch(props: PlaceSearchProps) {
  return (
    <APIProvider apiKey={API_KEY} libraries={["places"]}>
      <PlaceAutocompleteInput {...props} />
    </APIProvider>
  )
}

function PlaceAutocompleteInput({
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  id,
  disabled,
  ariaInvalid,
  ariaDescribedBy,
  ariaLabel,
  ariaRequired,
}: PlaceSearchProps) {
  const places = useMapsLibrary("places")
  const inputRef = useRef<HTMLInputElement>(null)
  // Latest callback in a ref so the widget is not re-attached on every render.
  const onSelectRef = useRef(onPlaceSelect)
  onSelectRef.current = onPlaceSelect

  useEffect(() => {
    if (!places || !inputRef.current) return
    const ac = new places.Autocomplete(inputRef.current, {
      fields: ["place_id", "name", "formatted_address", "geometry"],
    })
    const listener = ac.addListener("place_changed", () => {
      const p = ac.getPlace()
      if (!p.geometry?.location) return
      onSelectRef.current({
        location_name: p.name ?? "",
        address: p.formatted_address ?? "",
        lat: p.geometry.location.lat(),
        lng: p.geometry.location.lng(),
        google_place_id: p.place_id ?? "",
      })
    })
    return () => google.maps.event.removeListener(listener)
  }, [places])

  return (
    <Input
      ref={inputRef}
      id={id}
      disabled={disabled}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      aria-label={ariaLabel}
      aria-required={ariaRequired}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "Search places…"}
    />
  )
}

function DestinationSearch(props: DestinationSearchProps) {
  const [activated, setActivated] = useState(false)

  // A plain text field until the user focuses it, so the large Places script
  // loads only when it is actually needed.
  if (!activated) {
    return (
      <Input
        variant="bare"
        id={props.id}
        disabled={props.disabled}
        aria-invalid={props.ariaInvalid}
        aria-describedby={props.ariaDescribedBy}
        className={props.className}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        onFocus={() => setActivated(true)}
        placeholder={props.placeholder ?? "Search city, province, or country"}
        autoComplete="off"
      />
    )
  }

  return (
    <APIProvider apiKey={API_KEY} libraries={["places"]}>
      <DestinationAutocompleteInput {...props} autoFocus />
    </APIProvider>
  )
}

function DestinationAutocompleteInput({
  value,
  onChange,
  onSelect,
  placeholder,
  id,
  className,
  disabled,
  ariaInvalid,
  ariaDescribedBy,
  autoFocus,
}: DestinationSearchProps & { autoFocus?: boolean }) {
  const places = useMapsLibrary("places")
  const inputRef = useRef<HTMLInputElement>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    if (!places || !inputRef.current) return
    const ac = new places.Autocomplete(inputRef.current, {
      // `(regions)`: city, province/state and country only, no streets or businesses.
      types: ["(regions)"],
      fields: ["name", "formatted_address", "address_components"],
    })
    const listener = ac.addListener("place_changed", () => {
      const p = ac.getPlace()
      const description = p.formatted_address || p.name || ""
      if (!description) return
      const country = p.address_components?.find((c) => c.types.includes("country"))
      onChange(description)
      onSelectRef.current({
        description,
        name: p.name ?? "",
        countryCode: country?.short_name ?? "",
      })
    })
    return () => google.maps.event.removeListener(listener)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places])

  return (
    <Input
      variant="bare"
      ref={inputRef}
      id={id}
      disabled={disabled}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "Search city, province, or country"}
      autoComplete="off"
      autoFocus={autoFocus}
    />
  )
}

// ── Places services (programmatic lookups) ─────────────────────────────────

/** Poll until google.maps.places is available (loaded by a Boundary / search field). */
function waitForPlaces(): Promise<typeof google.maps.places | null> {
  return new Promise((resolve) => {
    let attempts = 0
    const check = () => {
      const places = window.google?.maps?.places
      if (places?.PlacesService && places?.AutocompleteService) {
        resolve(places)
        return
      }
      if (++attempts > 100) {
        resolve(null)
        return
      }
      setTimeout(check, 100)
    }
    check()
  })
}

function firstPredictionId(
  places: typeof google.maps.places,
  input: string,
  sessionToken: google.maps.places.AutocompleteSessionToken,
): Promise<string | null> {
  const service = new places.AutocompleteService()
  return new Promise((resolve) => {
    service.getPlacePredictions({ input, sessionToken }, (predictions, status) => {
      resolve(status === google.maps.places.PlacesServiceStatus.OK && predictions?.length ? predictions[0].place_id ?? null : null)
    })
  })
}

function getPredictions(
  service: google.maps.places.AutocompleteService,
  input: string,
  restriction: google.maps.LatLngBoundsLiteral | null,
  sessionToken: google.maps.places.AutocompleteSessionToken,
): Promise<google.maps.places.AutocompletePrediction[]> {
  return new Promise((resolve) => {
    const request: google.maps.places.AutocompleteRequest = { input, sessionToken }
    if (restriction) request.locationRestriction = restriction
    service.getPlacePredictions(request, (predictions, status) => {
      resolve(status === google.maps.places.PlacesServiceStatus.OK && predictions ? predictions : [])
    })
  })
}

function getPlaceDetails(
  service: google.maps.places.PlacesService,
  placeId: string,
  sessionToken?: google.maps.places.AutocompleteSessionToken,
): Promise<PlaceCandidate | null> {
  return new Promise((resolve) => {
    service.getDetails(
      // Basic fields only: contact, atmosphere or photo fields bill higher SKUs.
      { placeId, fields: ["name", "formatted_address", "geometry", "place_id", "types"], sessionToken },
      (place, status) => {
        const location = place?.geometry?.location
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place || !location) {
          resolve(null)
          return
        }
        resolve({
          name: place.name ?? "",
          description: place.formatted_address ?? "",
          lat: location.lat(),
          lng: location.lng(),
          externalId: place.place_id ?? placeId,
          types: place.types,
        })
      },
    )
  })
}

/**
 * The best-named prediction (or the few that tie with it) with its details.
 * One session token covers the autocomplete call and the first details call,
 * so they are billed as one session instead of separately.
 */
async function searchCandidates(
  places: typeof google.maps.places,
  autocomplete: google.maps.places.AutocompleteService,
  details: google.maps.places.PlacesService,
  input: string,
  restriction: google.maps.LatLngBoundsLiteral | null,
  intendedName: string,
): Promise<PlaceCandidate[]> {
  const sessionToken = new places.AutocompleteSessionToken()
  const predictions = await getPredictions(autocomplete, input, restriction, sessionToken)
  const likely = pickForDetails(predictions, intendedName, (p) => p.structured_formatting?.main_text ?? p.description)
  const settled = await Promise.allSettled(
    likely.map((prediction, i) => getPlaceDetails(details, prediction.place_id, i === 0 ? sessionToken : undefined)),
  )
  return settled.flatMap((result) => (result.status === "fulfilled" && result.value ? [result.value] : []))
}

function boundsAround(center: google.maps.LatLng): google.maps.LatLngBoundsLiteral {
  const cLat = center.lat()
  const cLng = center.lng()
  const dLat = BOUND_KM * DEG_LAT_PER_KM
  const dLng = (BOUND_KM * DEG_LAT_PER_KM) / Math.cos((cLat * Math.PI) / 180)
  return { west: cLng - dLng, east: cLng + dLng, south: cLat - dLat, north: cLat + dLat }
}

function geocodeDestination(destination: string): Promise<google.maps.LatLng | null> {
  const geocoder = new google.maps.Geocoder()
  return new Promise((resolve) => {
    geocoder.geocode({ address: destination }, (results, status) => {
      resolve(status === "OK" && results?.[0]?.geometry?.location ? results[0].geometry.location : null)
    })
  })
}

async function candidatesFor(
  queries: PlaceQuery[],
  input: (query: PlaceQuery) => string,
  restriction: google.maps.LatLngBoundsLiteral | null,
): Promise<Record<string, PlaceCandidate[]>> {
  const places = await waitForPlaces()
  if (!places) return {}
  const autocomplete = new places.AutocompleteService()
  const details = new places.PlacesService(document.createElement("div"))
  const entries = await Promise.all(
    queries.map(
      async (query) => [query.key, await searchCandidates(places, autocomplete, details, input(query), restriction, query.name)] as const,
    ),
  )
  return Object.fromEntries(entries)
}

/** Google Places in the browser (NEXT_PUBLIC_LOCATION_PROVIDER=google). */
export const googleLocationProvider: LocationProvider = {
  name: "google",
  Boundary,
  PlaceSearch,
  DestinationSearch,

  async resolveDestination(destination) {
    const places = await waitForPlaces()
    if (!places) return null
    const sessionToken = new places.AutocompleteSessionToken()
    const placeId = await firstPredictionId(places, destination, sessionToken)
    if (!placeId) return { description: destination }
    return new Promise((resolve) => {
      const service = new places.PlacesService(document.createElement("div"))
      // Only the address: photo fields would bill Places Photo usage.
      service.getDetails({ placeId, fields: ["formatted_address"], sessionToken }, (place) => {
        resolve({ description: place?.formatted_address ?? destination })
      })
    })
  },

  async findPlaceCandidates(queries, destination) {
    if (!(await waitForPlaces())) return {}
    const center = destination ? await geocodeDestination(destination) : null
    return candidatesFor(
      queries,
      (q) => [q.name, q.city || destination].filter(Boolean).join(" "),
      center ? boundsAround(center) : null,
    )
  },

  findPlaceCandidatesGlobally(queries) {
    return candidatesFor(queries, (q) => q.name, null)
  },
}
