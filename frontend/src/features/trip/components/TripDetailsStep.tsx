"use client"

import { Minus, Plus } from "lucide-react"

import { Chip } from "@/components/Chip"
import { FormField } from "@/components/forms/FormField"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { locationProvider, type PlaceData } from "@/features/location/provider"
import {
  MAX_ADULTS,
  MAX_CHILDREN,
  MAX_EVENT_NAME,
  TRANSPORT_MODES,
  TRIP_NEEDS,
  withChildren,
  type PlaceField,
  type TripDetailsForm,
} from "../lib/tripDetails"

interface Props {
  value: TripDetailsForm
  onChange: (value: TripDetailsForm) => void
  destination: string
  startDate: string
  endDate: string
}

function pickedPlace(p: PlaceData): PlaceField {
  const label = p.location_name || p.address
  return { text: label, picked: { label, address: p.address, lat: p.lat, lng: p.lng } }
}

// TripDetailsStep is the optional wizard step for trips built around one
// event: where the trip starts, how the group travels, the event itself, who
// is going, and what they need near the venue. Every field may stay empty.
export function TripDetailsStep({ value, onChange, destination, startDate, endDate }: Props) {
  const { PlaceSearch } = locationProvider
  const set = (patch: Partial<TripDetailsForm>) => onChange({ ...value, ...patch })
  const toggleNeed = (need: TripDetailsForm["needs"][number]) =>
    set({ needs: value.needs.includes(need) ? value.needs.filter((n) => n !== need) : [...value.needs, need] })

  return (
    <div className="space-y-5">
      <section className="space-y-3" aria-labelledby="details-travel">
        <h3 id="details-travel" className="text-sm font-semibold text-foreground">Getting there</h3>
        <FormField label="Starting point" htmlFor="details-origin" optional>
          <PlaceSearch
            id="details-origin"
            value={value.origin.text}
            onChange={(text) => set({ origin: { text, picked: value.origin.picked } })}
            onPlaceSelect={(p) => set({ origin: pickedPlace(p) })}
            placeholder="Home address or a Google Maps link"
          />
        </FormField>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Transport">
          {TRANSPORT_MODES.map((m) => (
            <Chip
              key={m.value}
              pressed={value.transportMode === m.value}
              onClick={() => set({ transportMode: value.transportMode === m.value ? "" : m.value })}
            >
              {m.label}
            </Chip>
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="details-event">
        <h3 id="details-event" className="text-sm font-semibold text-foreground">Main event</h3>
        <FormField label="Event name" htmlFor="details-event-name" optional>
          <Input
            id="details-event-name"
            value={value.eventName}
            maxLength={MAX_EVENT_NAME}
            placeholder="e.g. Fan meeting, concert, wedding"
            onChange={(e) => set({ eventName: e.target.value })}
          />
        </FormField>
        <FormField label="Venue" htmlFor="details-venue" optional>
          <PlaceSearch
            id="details-venue"
            value={value.venue.text}
            onChange={(text) => set({ venue: { text, picked: value.venue.picked } })}
            onPlaceSelect={(p) => set({ venue: pickedPlace(p) })}
            placeholder="Venue name or a Google Maps link"
            searchContext={destination}
          />
        </FormField>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormField label="Date" htmlFor="details-event-date">
            <Input
              id="details-event-date"
              type="date"
              min={startDate}
              max={endDate}
              value={value.eventDate}
              onChange={(e) => set({ eventDate: e.target.value })}
            />
          </FormField>
          <FormField label="Starts" htmlFor="details-event-start">
            <Input
              id="details-event-start"
              type="time"
              value={value.eventStart}
              onChange={(e) => set({ eventStart: e.target.value })}
            />
          </FormField>
          <FormField label="Ends" htmlFor="details-event-end">
            <Input
              id="details-event-end"
              type="time"
              value={value.eventEnd}
              onChange={(e) => set({ eventEnd: e.target.value })}
            />
          </FormField>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="details-who">
        <h3 id="details-who" className="text-sm font-semibold text-foreground">Who&apos;s going</h3>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Adults" htmlFor="details-adults" optional>
            <Input
              id="details-adults"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_ADULTS}
              value={value.adults}
              onChange={(e) => set({ adults: e.target.value })}
            />
          </FormField>
          <FormField label="Children" htmlFor="details-children">
            <div className="flex h-11 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Fewer children"
                disabled={value.children === 0}
                onClick={() => onChange(withChildren(value, value.children - 1))}
              >
                <Minus aria-hidden="true" />
              </Button>
              <span id="details-children" className="w-6 text-center font-semibold" aria-live="polite">
                {value.children}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="More children"
                disabled={value.children >= MAX_CHILDREN}
                onClick={() => onChange(withChildren(value, value.children + 1))}
              >
                <Plus aria-hidden="true" />
              </Button>
            </div>
          </FormField>
        </div>
        {value.children > 0 && (
          <div className="flex flex-wrap gap-3">
            {value.childAges.map((age, i) => (
              <div key={i} className="w-24">
                <FormField label={`Child ${i + 1} age`} htmlFor={`details-child-${i}`}>
                  <Input
                    id={`details-child-${i}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={17}
                    value={age}
                    onChange={(e) => {
                      const childAges = [...value.childAges]
                      childAges[i] = e.target.value
                      set({ childAges })
                    }}
                  />
                </FormField>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2" aria-labelledby="details-needs">
        <h3 id="details-needs" className="text-sm font-semibold text-foreground">Needs</h3>
        <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="details-needs">
          {TRIP_NEEDS.map((n) => (
            <Chip key={n.value} pressed={value.needs.includes(n.value)} onClick={() => toggleNeed(n.value)}>
              {n.label}
            </Chip>
          ))}
        </div>
      </section>
    </div>
  )
}
