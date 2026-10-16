"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarDays, ListChecks, MapPin, StickyNote } from "lucide-react"
import { useForm } from "react-hook-form"

import { FormActions } from "@/components/forms/FormActions"
import { FormField } from "@/components/forms/FormField"
import { SegmentedControl } from "@/components/SegmentedControl"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import {
  ACTIVITY_TYPES,
  activityFormDefaults,
  activityFormSchema,
  activityPayload,
  type ActivityFormValues,
} from "../lib/activityFormValues"
import type { Activity, ActivityType, CreateActivityInput } from "../types"
import { LocationFields } from "./form/LocationFields"
import { TodoFields } from "./form/TodoFields"

const TYPE_META: Record<ActivityType, { label: string; Icon: typeof MapPin; titlePlaceholder: string }> = {
  location: { label: "Location", Icon: MapPin, titlePlaceholder: "e.g. Kuta Beach" },
  note: { label: "Note", Icon: StickyNote, titlePlaceholder: "e.g. Reminders" },
  todo: { label: "Todo", Icon: ListChecks, titlePlaceholder: "e.g. Packing checklist" },
}

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
  /** Told whether anything was typed, so closing can ask before discarding it. */
  onDirtyChange?: (dirty: boolean) => void
}

/**
 * ActivityForm — used in two contexts:
 * 1. Inline add form in the timeline (no `initial`, all 3 type tabs visible)
 * 2. Edit dialog (pass `initial` + `lockType=true`)
 */
export function ActivityForm({ initial, lockType, onSubmit, onCancel, isSubmitting, context, onDirtyChange }: Props) {
  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: activityFormDefaults(initial),
  })
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = form
  const type = watch("type")

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const submit = async (v: ActivityFormValues) => {
    await onSubmit({
      type: v.type,
      title: v.title,
      start_time: v.start_time,
      end_time: v.end_time,
      payload: activityPayload(v),
    })
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-6" aria-busy={isSubmitting}>
      <fieldset disabled={isSubmitting} className="flex flex-col gap-6">
        {!initial && context && <AddingTo context={context} />}

        {!lockType && (
          <SegmentedControl
            aria-label="Activity type"
            value={type}
            onChange={(t) => setValue("type", t)}
            options={ACTIVITY_TYPES.map((t) => ({ value: t, label: TYPE_META[t].label, icon: TYPE_META[t].Icon }))}
          />
        )}

        <FormField label="Title" htmlFor="activity-title" required error={errors.title?.message} errorId="activity-title-error">
          <Input
            id="activity-title"
            aria-required="true"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "activity-title-error" : undefined}
            placeholder={TYPE_META[type].titlePlaceholder}
            {...register("title")}
          />
        </FormField>

        {type === "location" && (
          <LocationFields form={form} isSubmitting={isSubmitting} destination={context?.destination} />
        )}

        {type === "note" && (
          <FormField label="Note" htmlFor="activity-note" required error={errors.note_content?.message} errorId="activity-note-error">
            <Textarea
              id="activity-note"
              rows={4}
              aria-invalid={Boolean(errors.note_content)}
              aria-describedby={errors.note_content ? "activity-note-error" : undefined}
              placeholder="Write your notes here…"
              {...register("note_content")}
            />
          </FormField>
        )}

        {type === "todo" && <TodoFields form={form} />}

        <FormActions onCancel={onCancel} isSubmitting={isSubmitting} submitLabel={initial ? "Save changes" : "Add activity"} />
      </fieldset>
    </form>
  )
}

/** Which day (and near which destination) a new activity is added to. */
function AddingTo({ context }: { context: NonNullable<Props["context"]> }) {
  return (
    <aside
      aria-label="Activity context"
      className="grid gap-2 rounded-xl border border-primary/15 bg-primary/[0.04] p-3 sm:grid-cols-2"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
        <CalendarDays className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="text-muted-foreground">Adding to</span>
        <span className="font-semibold text-foreground">
          Day {context.dayNumber} · {formatContextDate(context.date)}
        </span>
      </div>
      {context.destination && (
        <div className="flex min-w-0 items-center gap-2 text-sm sm:justify-end">
          <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="shrink-0 text-muted-foreground">Near</span>
          <span className="min-w-0 truncate font-semibold text-foreground">{context.destination}</span>
        </div>
      )}
    </aside>
  )
}

function formatContextDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export type { ActivityType }
