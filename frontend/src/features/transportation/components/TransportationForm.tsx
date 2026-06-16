"use client"

import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Bus,
  Car,
  Plane,
  Ship,
  Train,
  TramFront,
  Boxes,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  TRANSPORTATION_TYPES,
  type CreateTransportationInput,
  type Transportation,
  type TransportationType,
} from "../types"

const TYPE_META: Record<
  TransportationType,
  { label: string; Icon: typeof Plane }
> = {
  flight: { label: "Flight", Icon: Plane },
  bus: { label: "Bus", Icon: Bus },
  train: { label: "Train", Icon: Train },
  ferry: { label: "Ferry", Icon: TramFront },
  ship: { label: "Ship", Icon: Ship },
  car: { label: "Car", Icon: Car },
  other: { label: "Other", Icon: Boxes },
}

const schema = z.object({
  type: z.enum([
    "flight",
    "bus",
    "train",
    "ferry",
    "ship",
    "car",
    "other",
  ]),
  label: z.string().max(120).optional(),
  operator: z.string().max(120).optional(),
  reference_number: z.string().max(120).optional(),
  from_location: z.string().max(200).optional(),
  to_location: z.string().max(200).optional(),
  departure_datetime: z.string().optional(),
  arrival_datetime: z.string().optional(),
  notes: z.string().max(2000).optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  initial?: Transportation
  onSubmit: (input: CreateTransportationInput) => Promise<unknown>
  onCancel: () => void
  isSubmitting: boolean
}

export function TransportationForm({
  initial,
  onSubmit,
  onCancel,
  isSubmitting,
}: Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: initial?.type ?? "flight",
      label: initial?.label ?? "",
      operator: initial?.operator ?? "",
      reference_number: initial?.reference_number ?? "",
      from_location: initial?.from_location ?? "",
      to_location: initial?.to_location ?? "",
      // <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm"; trim seconds.
      departure_datetime: toLocalInput(initial?.departure_datetime),
      arrival_datetime: toLocalInput(initial?.arrival_datetime),
      notes: initial?.notes ?? "",
    },
  })

  const submit = async (v: FormValues) => {
    await onSubmit({
      type: v.type,
      label: v.label,
      operator: v.operator,
      reference_number: v.reference_number,
      from_location: v.from_location,
      to_location: v.to_location,
      departure_datetime: fromLocalInput(v.departure_datetime),
      arrival_datetime: fromLocalInput(v.arrival_datetime),
      notes: v.notes,
    })
  }

  const openPicker = (e: React.MouseEvent<HTMLInputElement>) => {
    try {
      e.currentTarget.showPicker?.()
    } catch {
      // ignore — browser may refuse non-gesture calls
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      <Field label="Type" error={errors.type?.message}>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {TRANSPORTATION_TYPES.map((t) => {
                const meta = TYPE_META[t]
                const selected = field.value === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => field.onChange(t)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs transition-colors",
                      selected
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-input text-muted-foreground hover:border-ring",
                    )}
                  >
                    <meta.Icon className="h-4 w-4" />
                    <span className="leading-none">{meta.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Label" error={errors.label?.message}>
          <Input placeholder="GA 420" {...register("label")} />
        </Field>
        <Field label="Operator" error={errors.operator?.message}>
          <Input placeholder="Garuda Indonesia" {...register("operator")} />
        </Field>
      </div>

      <Field label="Reference number" error={errors.reference_number?.message}>
        <Input placeholder="ABC123" {...register("reference_number")} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="From" error={errors.from_location?.message}>
          <Input placeholder="CGK" {...register("from_location")} />
        </Field>
        <Field label="To" error={errors.to_location?.message}>
          <Input placeholder="DPS" {...register("to_location")} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Departure"
          error={errors.departure_datetime?.message}
        >
          <Input
            type="datetime-local"
            onClick={openPicker}
            {...register("departure_datetime")}
          />
        </Field>
        <Field
          label="Arrival"
          error={errors.arrival_datetime?.message}
        >
          <Input
            type="datetime-local"
            onClick={openPicker}
            {...register("arrival_datetime")}
          />
        </Field>
      </div>

      <Field label="Notes" error={errors.notes?.message}>
        <Textarea rows={2} {...register("notes")} />
      </Field>

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
          {isSubmitting ? "Saving…" : initial ? "Save" : "Add transport"}
        </Button>
      </div>
    </form>
  )
}

// Convert ISO 8601 from API to <input type="datetime-local"> shape.
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Convert datetime-local value back to RFC3339 for the API; empty → null.
function fromLocalInput(local: string | undefined): string | null {
  if (!local) return null
  const d = new Date(local)
  if (isNaN(d.getTime())) return null
  return d.toISOString()
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
