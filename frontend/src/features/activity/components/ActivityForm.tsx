"use client"

import { Controller, useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { MapPin, StickyNote, ListChecks, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LocationAutocomplete } from "./LocationAutocomplete"
import type {
  Activity,
  ActivityType,
  CreateActivityInput,
  LocationPayload,
  NotePayload,
  TodoPayload,
} from "../types"

const TYPES = ["location", "note", "todo"] as const

const TYPE_META: Record<ActivityType, { label: string; Icon: typeof MapPin }> = {
  location: { label: "Location", Icon: MapPin },
  note: { label: "Note", Icon: StickyNote },
  todo: { label: "Todo", Icon: ListChecks },
}

// Accepts dot or comma as decimal separator; trims trailing junk after first
// number prefix (e.g. paste of "108.2631914, 21" → 108.2631914).
function parseCoord(s: string): number {
  if (!s) return NaN
  const cleaned = s.replace(",", ".").trim()
  const match = cleaned.match(/^-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : NaN
}

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
      .refine((v) => !v || Number.isFinite(parseCoord(v)), "Invalid latitude"),
    lng: z
      .string()
      .optional()
      .refine((v) => !v || Number.isFinite(parseCoord(v)), "Invalid longitude"),
    address: z.string().optional(),
    google_place_id: z.string().optional(),
    location_notes: z.string().optional(),
    // note
    note_content: z.string().optional(),
    // todo
    todo_items: z
      .array(z.object({ id: z.string(), text: z.string(), completed: z.boolean() }))
      .optional(),
  })
  .superRefine((d, ctx) => {
    // Required field per activity type. Validated up front so the user sees
    // the error inline instead of the backend's 400.
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
  initial?: Activity
  lockType?: boolean
  onSubmit: (input: CreateActivityInput) => Promise<unknown>
  onCancel: () => void
  isSubmitting: boolean
}

export function ActivityForm({
  initial,
  lockType,
  onSubmit,
  onCancel,
  isSubmitting,
}: Props) {
  const defaults = buildDefaults(initial)
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  })

  const todoArr = useFieldArray({ control, name: "todo_items" })
  const type = watch("type")

  const submit = async (v: FormValues) => {
    await onSubmit({
      type: v.type,
      title: v.title,
      start_time: v.start_time,
      end_time: v.end_time,
      payload: buildPayload(v),
    })
  }

  // Open native time picker on click — same pattern as TripForm dates.
  const openPicker = (e: React.MouseEvent<HTMLInputElement>) => {
    try {
      e.currentTarget.showPicker?.()
    } catch {
      // strict browsers reject non-gesture calls — fall back to native icon
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      <Field label="Type" error={errors.type?.message}>
        <Controller
          control={control}
          name="type"
          render={({ field }) => {
            // Edit mode: render only the selected type as a static chip.
            // Add mode: render all 3 as togglable buttons.
            const visible = lockType
              ? TYPES.filter((t) => t === field.value)
              : TYPES
            return (
              <div
                className={cn(
                  "grid gap-2",
                  lockType ? "grid-cols-1" : "grid-cols-3",
                )}
              >
                {visible.map((t) => {
                  const meta = TYPE_META[t]
                  const selected = field.value === t
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => !lockType && field.onChange(t)}
                      disabled={lockType}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-xs transition-colors",
                        selected
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-input text-muted-foreground hover:border-ring",
                        lockType && "cursor-default",
                      )}
                    >
                      <meta.Icon className="h-5 w-5" />
                      <span>{meta.label}</span>
                    </button>
                  )
                })}
              </div>
            )
          }}
        />
      </Field>

      <Field label="Title" error={errors.title?.message}>
        <Input
          placeholder="Kuta Beach / Reminders / Packing list"
          {...register("title")}
        />
      </Field>

      {/* Times only meaningful for location activities. */}
      {type === "location" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start time" error={errors.start_time?.message}>
            <Input
              type="time"
              onClick={openPicker}
              {...register("start_time")}
            />
          </Field>
          <Field label="End time" error={errors.end_time?.message}>
            <Input type="time" onClick={openPicker} {...register("end_time")} />
          </Field>
        </div>
      )}

      {type === "location" && (
        <>
          <Field label="Location name" error={errors.location_name?.message}>
            <Controller
              control={control}
              name="location_name"
              render={({ field }) => (
                <LocationAutocomplete
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Search a place…"
                  onPlaceSelect={(p) => {
                    field.onChange(p.location_name)
                    setValue("lat", String(p.lat), { shouldValidate: true })
                    setValue("lng", String(p.lng), { shouldValidate: true })
                    setValue("address", p.address)
                    setValue("google_place_id", p.google_place_id)
                  }}
                />
              )}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude">
              <Input placeholder="-8.7184" {...register("lat")} />
            </Field>
            <Field label="Longitude">
              <Input placeholder="115.1686" {...register("lng")} />
            </Field>
          </div>
          <Field label="Address">
            <Input {...register("address")} />
          </Field>
          <Field label="Notes">
            <Textarea rows={2} {...register("location_notes")} />
          </Field>
        </>
      )}

      {type === "note" && (
        <Field label="Content" error={errors.note_content?.message}>
          <Textarea rows={4} {...register("note_content")} />
        </Field>
      )}

      {type === "todo" && (
        <div className="flex flex-col gap-2">
          <Label>Items</Label>
          {todoArr.fields.map((field, i) => (
            <div key={field.id} className="flex items-center gap-2">
              <Controller
                control={control}
                name={`todo_items.${i}.completed`}
                render={({ field: cb }) => (
                  <input
                    type="checkbox"
                    checked={!!cb.value}
                    onChange={(e) => cb.onChange(e.target.checked)}
                    className="h-4 w-4"
                  />
                )}
              />
              <Input
                placeholder="Item text"
                {...register(`todo_items.${i}.text`)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => todoArr.remove(i)}
                aria-label="Remove item"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              todoArr.append({
                id: crypto.randomUUID(),
                text: "",
                completed: false,
              })
            }
          >
            + Add item
          </Button>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : initial ? "Save" : "Add activity"}
        </Button>
      </div>
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
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export type { ActivityType }
