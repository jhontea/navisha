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
      fields: ["name", "formatted_address", "address_components"],
    })
    const listener = ac.addListener("place_changed", () => {
      const p = ac.getPlace()
      const description = p.formatted_address || p.name || ""
      if (!description) return
      const country = p.address_components?.find((c) =>
        c.types.includes("country"),
      )
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
