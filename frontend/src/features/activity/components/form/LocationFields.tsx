"use client"

import { useEffect, useState, type MouseEvent, type ReactNode } from "react"
import { ChevronDown, Clock3, Info } from "lucide-react"
import { Controller, type UseFormReturn } from "react-hook-form"

import { Chip } from "@/components/Chip"
import { FormField } from "@/components/forms/FormField"
import { FormFieldDescription, fieldDescriptionIds } from "@/components/forms/FormFieldState"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import type { ActivityFormValues } from "../../lib/activityFormValues"
import { addMinutesToTime, formatDuration, getDurationMinutes } from "../../lib/time"
import { LocationAutocomplete } from "../LocationAutocomplete"

const QUICK_DURATIONS = [
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
] as const

const validate = { shouldDirty: true, shouldValidate: true } as const

/** Open the native time picker on click (where the browser supports it). */
function openPicker(e: MouseEvent<HTMLInputElement>) {
  try {
    e.currentTarget.showPicker?.()
  } catch {
    // Not supported or not allowed here; typing still works.
  }
}

/** Times, place search and optional details of a location activity. */
export function LocationFields({
  form,
  isSubmitting,
  destination,
  title,
  needsReview,
}: {
  form: UseFormReturn<ActivityFormValues>
  isSubmitting: boolean
  /** Trip destination, to bias place search. */
  destination?: string
  /** The Title field, rendered right after Location name. */
  title: ReactNode
  /** Editing a place that is not pinned on the map yet. */
  needsReview?: boolean
}) {
  const {
    control,
    register,
    watch,
    getValues,
    setValue,
    setFocus,
    formState: { errors },
  } = form
  const startTime = watch("start_time") ?? ""
  const endTime = watch("end_time") ?? ""
  const durationMinutes = getDurationMinutes(startTime, endTime)
  const showReviewHint = Boolean(needsReview) && !watch("lat")

  useEffect(() => {
    // The place search forwards no ref, so RHF setFocus cannot reach it.
    if (needsReview) document.getElementById("activity-location")?.focus()
  }, [needsReview])

  const v = getValues()
  const [detailsOpen, setDetailsOpen] = useState(
    Boolean(v.address?.trim() || v.location_notes?.trim() || v.external_url?.trim()),
  )

  const updateStartTime = (value: string) => {
    setValue("start_time", value, validate)
    if (!value) setValue("end_time", "", validate)
  }

  const applyDuration = (minutes: number) => {
    const end = addMinutesToTime(startTime, minutes)
    if (end) setValue("end_time", end, validate)
  }

  return (
    <>
      <FormField label="Location name" htmlFor="activity-location" required error={errors.location_name?.message} errorId="activity-location-error">
        <Controller
          control={control}
          name="location_name"
          render={({ field }) => (
            <LocationAutocomplete
              id="activity-location"
              value={field.value ?? ""}
              onChange={(value) => {
                // Typing replaces the picked place, so drop its coordinates.
                field.onChange(value)
                setValue("lat", "")
                setValue("lng", "")
                setValue("address", "")
                setValue("google_place_id", "")
              }}
              disabled={isSubmitting}
              ariaInvalid={Boolean(errors.location_name)}
              ariaRequired
              ariaDescribedBy={fieldDescriptionIds(showReviewHint ? "activity-location-hint" : undefined, "activity-location-error", Boolean(errors.location_name))}
              searchContext={destination}
              placeholder="Search a place…"
              onPlaceSelect={(p) => {
                field.onChange(p.location_name)
                if (!getValues("title").trim()) setValue("title", p.location_name, validate)
                setValue("lat", String(p.lat), { shouldValidate: true })
                setValue("lng", String(p.lng), { shouldValidate: true })
                setValue("address", p.address)
                setValue("google_place_id", p.google_place_id)
                setValue("location_verification", "verified")
                // Keep the original Google Maps link so "Open in Google Maps"
                // reopens the exact place, not a coordinate approximation.
                if (p.source_url) setValue("external_url", p.source_url)
              }}
            />
          )}
        />
        {showReviewHint && (
          <FormFieldDescription id="activity-location-hint" className="flex items-start gap-1.5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span>Not on the map yet. Pick a place from the suggestions to pin it.</span>
          </FormFieldDescription>
        )}
      </FormField>

      {/* Coordinates come from the place search only. */}
      <input type="hidden" {...register("lat")} />
      <input type="hidden" {...register("lng")} />
      <input type="hidden" {...register("google_place_id")} />

      {title}

      <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
        <FormField label="Start time" htmlFor="activity-start-time" optional error={errors.start_time?.message} errorId="activity-start-time-error">
          <Controller
            control={control}
            name="start_time"
            render={({ field }) => (
              <Input
                ref={field.ref}
                id="activity-start-time"
                name={field.name}
                type="time"
                value={field.value ?? ""}
                aria-invalid={Boolean(errors.start_time)}
                aria-describedby={errors.start_time ? "activity-start-time-error" : undefined}
                onBlur={field.onBlur}
                onChange={(event) => updateStartTime(event.target.value)}
                onClick={openPicker}
              />
            )}
          />
        </FormField>
        <FormField label="End time" htmlFor="activity-end-time" optional error={errors.end_time?.message} errorId="activity-end-time-error">
          <Controller
            control={control}
            name="end_time"
            render={({ field }) => (
              <Input
                ref={field.ref}
                id="activity-end-time"
                name={field.name}
                type="time"
                value={field.value ?? ""}
                aria-invalid={Boolean(errors.end_time)}
                aria-describedby={errors.end_time ? "activity-end-time-error" : undefined}
                onBlur={field.onBlur}
                onChange={(event) => setValue("end_time", event.target.value, validate)}
                onClick={openPicker}
              />
            )}
          />
        </FormField>
      </div>

      <div className="rounded-xl border border-border/30 bg-muted/20 p-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Activity duration" aria-describedby={startTime ? undefined : "activity-duration-hint"}>
          <span className="mr-1 text-xs font-medium text-muted-foreground">Duration</span>
          {QUICK_DURATIONS.map((duration) => (
            <Chip
              key={duration.minutes}
              variant="option"
              disabled={!addMinutesToTime(startTime, duration.minutes)}
              pressed={durationMinutes === duration.minutes}
              onClick={() => applyDuration(duration.minutes)}
            >
              {duration.label}
            </Chip>
          ))}
          <Chip
            variant="option"
            disabled={!startTime}
            pressed={durationMinutes !== null && !QUICK_DURATIONS.some((d) => d.minutes === durationMinutes)}
            onClick={() => setFocus("end_time")}
          >
            Custom
          </Chip>
        </div>
        {/* Fixed height so the hint/summary appearing never shifts the fields below. */}
        <p id="activity-duration-hint" className="mt-2 flex h-4 items-center gap-1.5 text-xs text-muted-foreground">
          {!startTime ? (
            "Set a start time first"
          ) : (
            durationMinutes !== null && (
              <>
                <Clock3 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>
                  {startTime}–{endTime} · {formatDuration(durationMinutes)}
                </span>
              </>
            )
          )}
        </p>
      </div>

      <details
        className="group rounded-xl border border-border/30 bg-muted/15"
        open={detailsOpen}
        onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/30 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-sm font-medium text-foreground">Additional details</span>
            <span className="block text-xs text-muted-foreground">Address, link, and notes</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="space-y-4 border-t border-border/30 px-3 pb-3 pt-4">
          <FormField label="Address" htmlFor="activity-address" optional>
            <Input id="activity-address" placeholder="Auto-filled from location search" {...register("address")} />
          </FormField>
          <FormField label="Website or booking link" htmlFor="activity-external-url" optional error={errors.external_url?.message} errorId="activity-external-url-error">
            <Input
              id="activity-external-url"
              type="text"
              inputMode="url"
              placeholder="e.g. teamlab.art/tickets"
              aria-invalid={Boolean(errors.external_url)}
              aria-describedby={errors.external_url ? "activity-external-url-error" : undefined}
              {...register("external_url")}
            />
          </FormField>
          <FormField label="Notes" htmlFor="activity-location-notes" optional>
            <Textarea id="activity-location-notes" rows={2} placeholder="Any notes about this place…" {...register("location_notes")} />
          </FormField>
        </div>
      </details>
    </>
  )
}
