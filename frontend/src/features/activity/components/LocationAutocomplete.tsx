"use client"

import { useEffect, useRef } from "react"
import {
  APIProvider,
  useMapsLibrary,
} from "@vis.gl/react-google-maps"
import { Input } from "@/components/ui/input"
import { GeoapifyAutocomplete } from "@/features/location/components/GeoapifyAutocomplete"
import { LOCATION_PROVIDER } from "@/features/location/config"

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""

export interface PlaceData {
  location_name: string
  address: string
  lat: number
  lng: number
  google_place_id: string
}

interface Props {
  value: string
  onChange: (v: string) => void
  onPlaceSelect: (place: PlaceData) => void
  placeholder?: string
  id?: string
  disabled?: boolean
  ariaInvalid?: boolean
  ariaDescribedBy?: string
  ariaLabel?: string
  ariaRequired?: boolean
  searchContext?: string
}

export function LocationAutocomplete(props: Props) {
  if (LOCATION_PROVIDER === "geoapify") {
    return (
      <GeoapifyAutocomplete
        value={props.value}
        onChange={props.onChange}
        placeholder={props.placeholder}
        id={props.id}
        disabled={props.disabled}
        ariaInvalid={props.ariaInvalid}
        ariaDescribedBy={props.ariaDescribedBy}
        ariaLabel={props.ariaLabel}
        ariaRequired={props.ariaRequired}
        searchContext={props.searchContext}
        kind="place"
        className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
        onSelect={(suggestion) =>
          props.onPlaceSelect({
            location_name: suggestion.name,
            address: suggestion.description,
            lat: suggestion.lat,
            lng: suggestion.lng,
            google_place_id: suggestion.external_id,
          })
        }
      />
    )
  }

  // Wrap in APIProvider with the `places` library so we can use the legacy
  // Autocomplete widget. vis.gl dedupes script loads across instances by key.
  return (
    <APIProvider apiKey={API_KEY} libraries={["places"]}>
      <AutocompleteInput {...props} />
    </APIProvider>
  )
}

function AutocompleteInput({
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
}: Props) {
  const places = useMapsLibrary("places")
  const inputRef = useRef<HTMLInputElement>(null)
  // Stash latest onPlaceSelect in a ref so the effect doesn't re-attach
  // the Autocomplete every time the parent rerenders.
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
