"use client"

import { Controller, useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { MapPin, StickyNote, ListChecks, X, Plus } from "lucide-react"
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

  const openPicker = (e: React.MouseEvent<HTMLInputElement>) => {
    try {
      e.currentTarget.showPicker?.()
    } catch {
      // ignore
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      {/* Type switcher */}
      {!lockType && (
        <div className="flex rounded-xl border border-border/30 bg-muted/30 p-1 gap-1">
          {TYPES.map((t) => {
            const meta = TYPE_META[t]
            const selected = type === t
            return (
              <button
                key={t}
                type="button"
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
      <Field label="Title" error={errors.title?.message}>
        <Input
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
            <Field label="Start time" error={errors.start_time?.message}>
              <Input
                type="time"
                onClick={openPicker}
                {...register("start_time")}
              />
            </Field>
            <Field label="End time" error={errors.end_time?.message}>
              <Input
                type="time"
                onClick={openPicker}
                {...register("end_time")}
              />
            </Field>
          </div>

          <Field
            label="Location name"
            error={errors.location_name?.message}
          >
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

          {/* lat/lng stored silently — hidden inputs, editable but not prominent */}
          <input type="hidden" {...register("lat")} />
          <input type="hidden" {...register("lng")} />
          <input type="hidden" {...register("google_place_id")} />

          <Field label="Address">
            <Input
              placeholder="Auto-filled from location search"
              {...register("address")}
            />
          </Field>

          <Field label="Notes">
            <Textarea
              rows={2}
              placeholder="Any notes about this place…"
              {...register("location_notes")}
            />
          </Field>
        </>
      )}

      {/* Note fields */}
      {type === "note" && (
        <Field label="Note" error={errors.note_content?.message}>
          <Textarea
            rows={4}
            placeholder="Write your notes here…"
            {...register("note_content")}
          />
        </Field>
      )}

      {/* Todo fields */}
      {type === "todo" && (
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium">Todo items</Label>
          <div className="space-y-2">
            {todoArr.fields.map((field, i) => (
              <div key={field.id} className="flex items-center gap-2 group/item">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 group-hover/item:bg-primary/50 transition-colors" />
                </div>
                <Input
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
          {errors.todo_items?.message && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <span>⚠</span> {errors.todo_items.message}
            </p>
          )}
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
