"use client"

import { Controller, useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CalendarDays, Clock3, MapPin, StickyNote, ListChecks, X, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  FormFieldError,
  FormFieldLabel,
} from "@/components/forms/FormFieldState"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LocationAutocomplete } from "./LocationAutocomplete"
import {
  addMinutesToTime,
  formatDuration,
  getDurationMinutes,
} from "../lib/time"
import type {
  Activity,
  ActivityType,
  CreateActivityInput,
  LocationPayload,
  NotePayload,
  TodoPayload,
} from "../types"

const TYPES = ["location", "note", "todo"] as const

const TYPE_META: Record<
  ActivityType,
  { label: string; Icon: typeof MapPin }
> = {
  location: { label: "Location", Icon: MapPin },
  note: { label: "Note", Icon: StickyNote },
  todo: { label: "Todo", Icon: ListChecks },
}

function parseCoord(s: string): number {
  if (!s) return NaN
  const cleaned = s.replace(",", ".").trim()
  const match = cleaned.match(/^-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : NaN
}

const QUICK_DURATIONS = [
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
] as const

const schema = z
  .object({
    type: z.enum(TYPES),
    title: z.string().min(1, "Title is required").max(120),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    // location
    location_name: z.string().optional(),
    lat: z
      .string()
      .optional()
      .refine(
        (v) => !v || Number.isFinite(parseCoord(v)),
        "Invalid latitude",
      ),
    lng: z
      .string()
      .optional()
      .refine(
        (v) => !v || Number.isFinite(parseCoord(v)),
        "Invalid longitude",
      ),
    address: z.string().optional(),
    google_place_id: z.string().optional(),
    location_notes: z.string().optional(),
    // note
    note_content: z.string().optional(),
    // todo
    todo_items: z
      .array(
        z.object({
          id: z.string(),
          text: z.string(),
          completed: z.boolean(),
        }),
      )
      .optional(),
  })
  .superRefine((d, ctx) => {
    if (d.type === "location" && d.start_time && d.end_time) {
      const duration = getDurationMinutes(d.start_time, d.end_time)
      if (duration === null) {
        ctx.addIssue({
          code: "custom",
          message: "End time must be later than start time",
          path: ["end_time"],
        })
      }
    }
    if (d.type === "location" && !d.location_name?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Location name is required",
        path: ["location_name"],
      })
    }
    if (d.type === "note" && !d.note_content?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Content is required",
        path: ["note_content"],
      })
    }
    if (d.type === "todo" && (!d.todo_items || d.todo_items.length === 0)) {
      ctx.addIssue({
        code: "custom",
        message: "Add at least one todo item",
        path: ["todo_items"],
      })
    }
  })

type FormValues = z.infer<typeof schema>

interface Props {
  /** When provided, renders as an edit form (type locked). */
  initial?: Activity
  lockType?: boolean
  onSubmit: (input: CreateActivityInput) => Promise<unknown>
  onCancel: () => void
  isSubmitting: boolean
  context?: {
    dayNumber: number
    date: string
    destination?: string
  }
}

/**
 * ActivityForm — used in two contexts:
 * 1. Inline add form in the timeline (no `initial`, all 3 type tabs visible)
 * 2. Edit dialog (pass `initial` + `lockType=true`)
 */
export function ActivityForm({
  initial,
  lockType,
  onSubmit,
  onCancel,
  isSubmitting,
  context,
}: Props) {
  const defaults = buildDefaults(initial)
  const {
    register,
    handleSubmit,
    control,
    watch,
    getValues,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  })

  const todoArr = useFieldArray({ control, name: "todo_items" })
  const type = watch("type")
  const startTime = watch("start_time") ?? ""
  const endTime = watch("end_time") ?? ""
  const durationMinutes = getDurationMinutes(startTime, endTime)

  const updateStartTime = (value: string) => {
    setValue("start_time", value, { shouldDirty: true, shouldValidate: true })
    const currentEnd = getValues("end_time") ?? ""

    if (!value) {
      setValue("end_time", "", { shouldDirty: true, shouldValidate: true })
      return
    }

    if (!currentEnd) {
      const defaultEnd = addMinutesToTime(value, 60)
      if (defaultEnd) {
        setValue("end_time", defaultEnd, {
          shouldDirty: true,
          shouldValidate: true,
        })
      }
      return
    }

    setValue("end_time", currentEnd, { shouldValidate: true })
  }

  const applyDuration = (minutes: number) => {
    const end = addMinutesToTime(startTime, minutes)
    if (!end) return
    setValue("end_time", end, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  const submit = async (v: FormValues) => {
    await onSubmit({
      type: v.type,
      title: v.title,
      start_time: v.start_time,
      end_time: v.end_time,
      payload: buildPayload(v),
    })
  }

  const openPicker = (e: React.MouseEvent<HTMLInputElement>) => {
    try {
      e.currentTarget.showPicker?.()
    } catch {
      // ignore
    }
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="flex flex-col gap-4"
      aria-busy={isSubmitting}
    >
      <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
      {!initial && context && (
        <aside
          aria-label="Activity context"
          className="grid gap-2 rounded-xl border border-primary/15 bg-primary/[0.04] p-3 sm:grid-cols-2"
        >
          <div className="flex items-center gap-2 text-sm">
            <CalendarDays className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="text-muted-foreground">Adding to</span>
            <span className="font-semibold text-foreground">
              Day {context.dayNumber} · {formatContextDate(context.date)}
            </span>
          </div>
          {context.destination && (
            <div className="flex items-center gap-2 text-sm sm:justify-end">
              <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="text-muted-foreground">Near</span>
              <span className="truncate font-semibold text-foreground">
                {context.destination}
              </span>
            </div>
          )}
        </aside>
      )}
      {/* Type switcher */}
      {!lockType && (
        <div
          className="flex rounded-xl border border-border/30 bg-muted/30 p-1 gap-1"
          role="group"
          aria-label="Activity type"
        >
          {TYPES.map((t) => {
            const meta = TYPE_META[t]
            const selected = type === t
            return (
              <button
                key={t}
                type="button"
                aria-pressed={selected}
                onClick={() => setValue("type", t)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                  selected
                    ? "bg-background text-foreground shadow-sm border border-border/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                )}
              >
                <meta.Icon className={cn("h-3.5 w-3.5", selected ? "text-primary" : "")} />
                {meta.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Title — always visible */}
      <Field label="Title" htmlFor="activity-title" required error={errors.title?.message} errorId="activity-title-error">
        <Input
          id="activity-title"
          aria-required="true"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "activity-title-error" : undefined}
          placeholder={
            type === "location"
              ? "e.g. Kuta Beach"
              : type === "note"
                ? "e.g. Reminders"
                : "e.g. Packing checklist"
          }
          {...register("title")}
        />
      </Field>

      {/* Location fields */}
      {type === "location" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start time" htmlFor="activity-start-time" optional error={errors.start_time?.message} errorId="activity-start-time-error">
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
            </Field>
            <Field label="End time" htmlFor="activity-end-time" optional error={errors.end_time?.message} errorId="activity-end-time-error">
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
                    onChange={(event) =>
                      setValue("end_time", event.target.value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    onClick={openPicker}
                  />
                )}
              />
            </Field>
          </div>

          {startTime && (
            <div className="rounded-xl border border-border/30 bg-muted/20 p-3">
              <div
                className="flex flex-wrap items-center gap-2"
                role="group"
                aria-label="Activity duration"
              >
                <span className="mr-1 text-xs font-medium text-muted-foreground">
                  Duration
                </span>
                {QUICK_DURATIONS.map((duration) => {
                  const end = addMinutesToTime(startTime, duration.minutes)
                  const selected = durationMinutes === duration.minutes
                  return (
                    <button
                      key={duration.minutes}
                      type="button"
                      disabled={!end}
                      aria-pressed={selected}
                      onClick={() => applyDuration(duration.minutes)}
                      className={cn(
                        "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/50 bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
                      )}
                    >
                      {duration.label}
                    </button>
                  )
                })}
                <button
                  type="button"
                  aria-pressed={
                    durationMinutes !== null &&
                    !QUICK_DURATIONS.some((duration) => duration.minutes === durationMinutes)
                  }
                  onClick={() => setFocus("end_time")}
                  className="rounded-lg border border-border/50 bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  Custom
                </button>
              </div>
              {durationMinutes !== null && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  <span>
                    {startTime}–{endTime} · {formatDuration(durationMinutes)}
                  </span>
                </p>
              )}
            </div>
          )}

          <Field
            label="Location name"
            htmlFor="activity-location"
            required
            error={errors.location_name?.message}
            errorId="activity-location-error"
          >
            <Controller
              control={control}
              name="location_name"
              render={({ field }) => (
                <LocationAutocomplete
                  id="activity-location"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                  ariaInvalid={Boolean(errors.location_name)}
                  ariaRequired
                  ariaDescribedBy={errors.location_name ? "activity-location-error" : undefined}
                  searchContext={context?.destination}
                  placeholder="Search a place…"
                  onPlaceSelect={(p) => {
                    field.onChange(p.location_name)
                    if (!getValues("title").trim()) {
                      setValue("title", p.location_name, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    setValue("lat", String(p.lat), { shouldValidate: true })
                    setValue("lng", String(p.lng), { shouldValidate: true })
                    setValue("address", p.address)
                    setValue("google_place_id", p.google_place_id)
                  }}
                />
              )}
            />
          </Field>

          {/* lat/lng stored silently — hidden inputs, editable but not prominent */}
          <input type="hidden" {...register("lat")} />
          <input type="hidden" {...register("lng")} />
          <input type="hidden" {...register("google_place_id")} />

          <Field label="Address" htmlFor="activity-address" optional>
            <Input
              id="activity-address"
              placeholder="Auto-filled from location search"
              {...register("address")}
            />
          </Field>

          <Field label="Notes" htmlFor="activity-location-notes" optional>
            <Textarea
              id="activity-location-notes"
              rows={2}
              placeholder="Any notes about this place…"
              {...register("location_notes")}
            />
          </Field>
        </>
      )}

      {/* Note fields */}
      {type === "note" && (
        <Field label="Note" htmlFor="activity-note" required error={errors.note_content?.message} errorId="activity-note-error">
          <Textarea
            id="activity-note"
            rows={4}
            aria-invalid={Boolean(errors.note_content)}
            aria-describedby={errors.note_content ? "activity-note-error" : undefined}
            placeholder="Write your notes here…"
            {...register("note_content")}
          />
        </Field>
      )}

      {/* Todo fields */}
      {type === "todo" && (
        <div className="flex flex-col gap-2">
          <FormFieldLabel id="activity-todo-label" required>Todo items</FormFieldLabel>
          <div
            className="space-y-2"
            role="group"
            aria-labelledby="activity-todo-label"
            aria-describedby={errors.todo_items ? "activity-todo-error" : undefined}
          >
            {todoArr.fields.map((field, i) => (
              <div key={field.id} className="flex items-center gap-2 group/item">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 group-hover/item:bg-primary/50 transition-colors" />
                </div>
                <Input
                  aria-label={`Todo item ${i + 1}`}
                  placeholder={`Item ${i + 1}…`}
                  className="flex-1 h-8 text-sm"
                  {...register(`todo_items.${i}.text`)}
                />
                <button
                  type="button"
                  onClick={() => todoArr.remove(i)}
                  aria-label="Remove item"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover/item:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <FormFieldError id="activity-todo-error">{errors.todo_items?.message}</FormFieldError>
          <button
            type="button"
            onClick={() =>
              todoArr.append({
                id: crypto.randomUUID(),
                text: "",
                completed: false,
              })
            }
            className="flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-border/50 px-3 py-1.5 text-sm text-muted-foreground hover:border-primary/60 hover:text-primary hover:bg-primary/5 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Add item
          </button>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-border/30">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 px-2 py-1 rounded-lg hover:bg-muted"
        >
          Cancel
        </button>
        <Button type="submit" size="sm" variant="gradient" disabled={isSubmitting} className="min-w-[100px]">
          {isSubmitting ? (
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              Saving…
            </span>
          ) : initial ? "Save changes" : "Add activity"}
        </Button>
      </div>
      </fieldset>
    </form>
  )
}

function buildDefaults(initial?: Activity): FormValues {
  if (!initial) {
    return {
      type: "location",
      title: "",
      start_time: "",
      end_time: "",
      location_name: "",
      lat: "",
      lng: "",
      address: "",
      google_place_id: "",
      location_notes: "",
      note_content: "",
      todo_items: [],
    }
  }
  const base: FormValues = {
    type: initial.type,
    title: initial.title,
    start_time: initial.start_time ?? "",
    end_time: initial.end_time ?? "",
    location_name: "",
    lat: "",
    lng: "",
    address: "",
    google_place_id: "",
    location_notes: "",
    note_content: "",
    todo_items: [],
  }
  if (!initial.payload) return base
  switch (initial.type) {
    case "location": {
      const p = initial.payload as LocationPayload
      return {
        ...base,
        location_name: p.location_name ?? "",
        lat: p.lat?.toString() ?? "",
        lng: p.lng?.toString() ?? "",
        address: p.address ?? "",
        google_place_id: p.google_place_id ?? "",
        location_notes: p.notes ?? "",
      }
    }
    case "note":
      return {
        ...base,
        note_content: (initial.payload as NotePayload).content ?? "",
      }
    case "todo":
      return {
        ...base,
        todo_items: (initial.payload as TodoPayload).items ?? [],
      }
  }
}

function buildPayload(v: FormValues) {
  switch (v.type) {
    case "location": {
      const lat = v.lat ? parseCoord(v.lat) : 0
      const lng = v.lng ? parseCoord(v.lng) : 0
      return {
        location_name: v.location_name ?? "",
        lat: Number.isFinite(lat) ? lat : 0,
        lng: Number.isFinite(lng) ? lng : 0,
        google_place_id: v.google_place_id ?? "",
        address: v.address ?? "",
        notes: v.location_notes ?? "",
        image_urls: [],
      }
    }
    case "note":
      return { content: v.note_content ?? "" }
    case "todo":
      return { items: v.todo_items ?? [] }
  }
}

function Field({
  label,
  htmlFor,
  error,
  errorId,
  required,
  optional,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  errorId?: string
  required?: boolean
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <FormFieldLabel htmlFor={htmlFor} required={required} optional={optional}>{label}</FormFieldLabel>
      {children}
      <FormFieldError id={errorId}>{error}</FormFieldError>
    </div>
  )
}

export type { ActivityType }

function formatContextDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}
