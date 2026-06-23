"use client"

import { useEffect, useRef } from "react"
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps"

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""

export interface DestinationData {
  /** Human-readable destination, e.g. "Tokyo, Japan" */
  description: string
  /** Short name of the selected place, e.g. "Tokyo" */
  name: string
  /** ISO country code from address components, e.g. "JP" (empty if unavailable) */
  countryCode: string
  /** Google Places photo URL for the destination, "" if none found */
  photoUrl: string
}

interface Props {
  value: string
  onChange: (v: string) => void
  onSelect: (place: DestinationData) => void
  placeholder?: string
  id?: string
  className?: string
}

export function DestinationAutocomplete(props: Props) {
  // Wrap in APIProvider with the `places` library so we can use the legacy
  // Autocomplete widget (backed by the classic Places API, which is the one
  // enabled on this project's key). vis.gl dedupes script loads by key.
  return (
    <APIProvider apiKey={API_KEY} libraries={["places"]}>
      <AutocompleteInput {...props} />
    </APIProvider>
  )
}

function AutocompleteInput({
  value,
  onChange,
  onSelect,
  placeholder,
  id,
  className,
}: Props) {
  const places = useMapsLibrary("places")
  const inputRef = useRef<HTMLInputElement>(null)
  // Stash latest onSelect so the effect doesn't re-attach the widget on every
  // parent rerender.
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    if (!places || !inputRef.current) return
    const ac = new places.Autocomplete(inputRef.current, {
      // `(regions)` restricts results to city, province/state, and country —
      // no street addresses or business POIs.
      types: ["(regions)"],
      fields: ["name", "formatted_address", "address_components", "photos"],
    })
    const listener = ac.addListener("place_changed", () => {
      const p = ac.getPlace()
      const description = p.formatted_address || p.name || ""
      if (!description) return
      const country = p.address_components?.find((c) =>
        c.types.includes("country"),
      )
      // Emit the textual result immediately so the input + form update without
      // waiting on the (possibly async) photo lookup.
      onChange(description)

      const emit = (photoUrl: string) =>
        onSelectRef.current({
          description,
          name: p.name ?? "",
          countryCode: country?.short_name ?? "",
          photoUrl,
        })

      // Regions (city/country) attach a photo. Use it directly if present.
      const directPhoto = p.photos?.[0]
      if (directPhoto) {
        emit(directPhoto.getUrl({ maxWidth: 800 }))
        return
      }

      // Fallback: regions often have no photo, so run a Text Search for the
      // place name to grab a representative landmark photo.
      fetchFallbackPhoto(places, p.name || description)
        .then((url) => emit(url))
        .catch(() => emit(""))
    })
    return () => google.maps.event.removeListener(listener)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places])

  return (
    <input
      ref={inputRef}
      id={id}
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "Search city, province, or country"}
      autoComplete="off"
    />
  )
}

// Runs a Places Text Search for the given query and resolves the first result's
// photo URL. Resolves to "" when nothing usable is found.
function fetchFallbackPhoto(
  places: google.maps.PlacesLibrary,
  query: string,
): Promise<string> {
  return new Promise((resolve) => {
    if (!query) {
      resolve("")
      return
    }
    // PlacesService needs a DOM node or map; an offscreen div is enough for
    // a text search request.
    const service = new places.PlacesService(document.createElement("div"))
    service.textSearch(
      { query },
      (results, status) => {

        if (
          status !== google.maps.places.PlacesServiceStatus.OK ||
          !results?.length
        ) {
          resolve("")
          return
        }
        const photo = results.find((r) => r.photos?.length)?.photos?.[0]
        resolve(photo ? photo.getUrl({ maxWidth: 800 }) : "")
      },
    )
  })
}
