"use client"

import { useEffect, useRef, useState } from "react"
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps"
import { GeoapifyAutocomplete } from "@/features/location/components/GeoapifyAutocomplete"
import { LOCATION_PROVIDER } from "@/features/location/config"

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
  disabled?: boolean
  ariaInvalid?: boolean
  ariaDescribedBy?: string
}

export function DestinationAutocomplete(props: Props) {
  if (LOCATION_PROVIDER === "geoapify") {
    return (
      <GeoapifyAutocomplete
        {...props}
        kind="region"
        onSelect={(suggestion) =>
          props.onSelect({
            description: suggestion.description,
            name: suggestion.name,
            countryCode: suggestion.country_code,
          })
        }
      />
    )
  }

  return <DeferredGoogleAutocomplete {...props} />
}

function DeferredGoogleAutocomplete(props: Props) {
  const [activated, setActivated] = useState(false)

  // Keep a fully functional text input before interaction. The large Places
  // script starts only when the user actually focuses this field.
  if (!activated) {
    return (
      <input
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
      <AutocompleteInput {...props} autoFocus />
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
  disabled,
  ariaInvalid,
  ariaDescribedBy,
  autoFocus,
}: Props & { autoFocus?: boolean }) {
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
