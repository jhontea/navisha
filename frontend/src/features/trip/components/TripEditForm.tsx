"use client"

import { Check, X } from "lucide-react"
import { ActionDisabledHint } from "@/components/forms/ActionDisabledHint"
import { Button } from "@/components/ui/button"
import { DestinationAutocomplete } from "./DestinationAutocomplete"
import { TravelDateRangePicker } from "./TravelDateRangePicker"
import { canRenderTripCover } from "../lib/cover"

type TripEditFormProps = {
  title: string
  description: string
  coverImageUrl: string
  startDate: string
  endDate: string
  isUpdating: boolean
  saveDisabledReason?: string | null
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onCoverChange: (value: string) => void
  onDateChange: (range: { startDate: string; endDate: string }) => void
  onSave: () => void
  onCancel: () => void
}

export function TripEditForm({
  title,
  description,
  coverImageUrl,
  startDate,
  endDate,
  isUpdating,
  saveDisabledReason,
  onTitleChange,
  onDescriptionChange,
  onCoverChange,
  onDateChange,
  onSave,
  onCancel,
}: TripEditFormProps) {
  return (
    <div className="border-b bg-background px-4 py-4 md:px-10 md:py-5" role="dialog" aria-label="Edit trip">
      <div className="mx-auto flex w-full max-w-max-width flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
            Editing
          </span>
        </div>

        <input
          autoFocus
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onCancel()
          }}
          placeholder="Trip title"
          className="w-full rounded-lg border border-primary bg-background px-3 py-1.5 text-xl font-bold tracking-tight text-foreground focus:outline-none md:text-2xl"
          disabled={isUpdating}
        />

        <DestinationAutocomplete
          value={description}
          onChange={onDescriptionChange}
          onSelect={(place) => onDescriptionChange(place.description)}
          placeholder="Search city, province, or country"
          className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
        />

        {canRenderTripCover(coverImageUrl) && (
          <div className="relative h-28 w-full overflow-hidden rounded-lg border border-input">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImageUrl}
              alt="Trip cover preview"
              className="h-full w-full object-cover"
              onError={() => onCoverChange("")}
            />
            <button
              type="button"
              onClick={() => onCoverChange("")}
              className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-1 text-xs font-medium text-white hover:bg-black/70"
            >
              Remove
            </button>
          </div>
        )}

        <TravelDateRangePicker
          startDate={startDate}
          endDate={endDate}
          disabled={isUpdating}
          onChange={onDateChange}
        />

        <ActionDisabledHint id="trip-save-disabled-reason" reason={saveDisabledReason ?? null} />

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onSave}
            disabled={isUpdating || Boolean(saveDisabledReason)}
            aria-describedby={saveDisabledReason ? "trip-save-disabled-reason" : undefined}
          >
            <Check className="h-3.5 w-3.5" />
            {isUpdating ? "Saving…" : "Save"}
          </Button>
          <Button size="sm" type="button" variant="outline" onClick={onCancel} disabled={isUpdating}>
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
