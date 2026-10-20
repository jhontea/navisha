"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/Chip"
import { useRef, useState } from "react"
import { Clock3, Plus, X } from "lucide-react"
import {
  FormFieldDescription,
  FormFieldError,
  FormFieldLabel,
} from "@/components/forms/FormFieldState"

interface Props {
  departure: string
  arrival: string
  onDepartureChange: (value: string) => void
  onArrivalChange: (value: string) => void
  departureError?: string
  arrivalError?: string
  disabled?: boolean
}

export function TransportationScheduleFields({
  departure,
  arrival,
  onDepartureChange,
  onArrivalChange,
  departureError,
  arrivalError,
  disabled = false,
}: Props) {
  const arrivalInputRef = useRef<HTMLInputElement>(null)
  const [showArrival, setShowArrival] = useState(Boolean(arrival))

  if (arrival && !showArrival) setShowArrival(true)

  const addArrival = () => {
    setShowArrival(true)
    window.setTimeout(() => arrivalInputRef.current?.focus(), 0)
  }

  return (
    <section className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
            Schedule
          </h3>
          <FormFieldDescription className="mt-1">
            Enter the local time shown at each station, port, or airport.
          </FormFieldDescription>
        </div>
      </div>

      <div className={`grid gap-4 ${showArrival ? "md:grid-cols-2" : ""}`}>
        <div className="space-y-2">
          <FormFieldLabel
            required
            className="text-sm"
            htmlFor="departure-datetime"
          >
            Departure
          </FormFieldLabel>
          <Input
            id="departure-datetime"
            type="datetime-local"
            aria-required="true"
            value={departure}
            disabled={disabled}
            aria-invalid={Boolean(departureError)}
            aria-describedby={departureError ? "departure-error" : undefined}
            className={`h-auto w-full rounded-xl border bg-card px-4 py-2.5 text-base outline-hidden transition-all focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60 ${
              departureError ? "border-destructive" : "border-border"
            }`}
            onChange={(event) => onDepartureChange(event.target.value)}
            onClick={(event) => {
              try {
                event.currentTarget.showPicker?.()
              } catch {
                // Native picker remains available through the input control.
              }
            }}
          />
          <FormFieldError id="departure-error">{departureError}</FormFieldError>
        </div>

        {showArrival ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <FormFieldLabel
                optional
                className="text-sm"
                htmlFor="arrival-datetime"
              >
                Arrival
              </FormFieldLabel>
              <Button
                type="button"
                disabled={disabled}
                onClick={() => {
                  onArrivalChange("")
                  setShowArrival(false)
                }}
                aria-label="Remove arrival time"
variant="ghost" size="icon-xs" className="text-muted-foreground">
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
            <Input
              ref={arrivalInputRef}
              id="arrival-datetime"
              type="datetime-local"
              value={arrival}
              disabled={disabled}
              aria-invalid={Boolean(arrivalError)}
              aria-describedby={arrivalError ? "arrival-error" : undefined}
              className={`h-auto w-full rounded-xl border bg-card px-4 py-2.5 text-base outline-hidden transition-all focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60 ${
                arrivalError ? "border-destructive" : "border-border"
              }`}
              onChange={(event) => onArrivalChange(event.target.value)}
              onClick={(event) => {
                try {
                  event.currentTarget.showPicker?.()
                } catch {
                  // Native picker remains available through the input control.
                }
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Chip
                disabled={disabled || !departure || !arrival}
                onClick={() => onArrivalChange(moveArrivalToDay(departure, arrival, 0))}
              >
                Same day
              </Chip>
              <Chip
                disabled={disabled || !departure || !arrival}
                onClick={() => onArrivalChange(moveArrivalToDay(departure, arrival, 1))}
              >
                +1 day
              </Chip>
            </div>
            <FormFieldError id="arrival-error">{arrivalError}</FormFieldError>
          </div>
        ) : (
          <Button
            type="button"
            disabled={disabled}
            onClick={addArrival}
variant="soft">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add arrival time
          </Button>
        )}
      </div>
    </section>
  )
}

function moveArrivalToDay(departure: string, arrival: string, dayOffset: number) {
  const departureDate = parseLocalDateTime(departure)
  if (!departureDate) return arrival

  const arrivalDate = parseLocalDateTime(arrival)
  if (!arrivalDate) return arrival

  const hour = arrivalDate.getHours()
  const minute = arrivalDate.getMinutes()
  departureDate.setDate(departureDate.getDate() + dayOffset)
  departureDate.setHours(hour, minute, 0, 0)
  return toLocalDateTime(departureDate)
}

function parseLocalDateTime(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function toLocalDateTime(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hour}:${minute}`
}
