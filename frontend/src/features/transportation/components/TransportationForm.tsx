"use client"

import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Bus,
  Car,
  Plane,
  Ship,
  Ticket,
  Train,
  TramFront,
  Boxes,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { LocationAutocomplete } from "@/features/activity/components/LocationAutocomplete"
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

const SUPPORTED_CURRENCIES = ["IDR", "USD", "JPY", "SGD", "KRW", "MYR", "THB", "EUR", "VND"] as const

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
  from_location: z.string().min(1, "From location is required").max(200),
  to_location: z.string().min(1, "To location is required").max(200),
  departure_datetime: z.string().min(1, "Departure time is required"),
  arrival_datetime: z.string().optional(),
  notes: z.string().max(2000).optional(),
  amount: z.string().optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  initial?: Transportation
  /** When true, the type selector is shown as a read-only chip (no changing type on edit). */
  lockType?: boolean
  tripBaseCurrency?: string
  withCost?: boolean
  onSubmit: (input: CreateTransportationInput) => Promise<unknown>
  onCancel: () => void
  isSubmitting: boolean
}

export function TransportationForm({
  initial,
  lockType,
  tripBaseCurrency,
  withCost,
  onSubmit,
  onCancel,
  isSubmitting,
}: Props) {
  const defaultCurrency =
    (tripBaseCurrency as FormValues["currency"]) ?? "IDR"
  const {
    register,
    handleSubmit,
    control,
    watch,
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
      departure_datetime: toLocalInput(initial?.departure_datetime),
      arrival_datetime: toLocalInput(initial?.arrival_datetime),
      notes: initial?.notes ?? "",
      amount: "",
      currency: defaultCurrency,
    },
  })

  // watch type for potential future conditional rendering
  void watch("type")

  const submit = async (v: FormValues) => {
    const amount = v.amount ? Number(v.amount) : 0
    const cost =
      withCost && amount > 0 && v.currency
        ? { amount, currency: v.currency }
        : null
    const entity: CreateTransportationInput = {
      type: v.type,
      label: v.label,
      operator: v.operator,
      // Save label value to reference_number as well so it’s stored on both fields
      reference_number: v.label,
      from_location: v.from_location,
      to_location: v.to_location,
      departure_datetime: fromLocalInput(v.departure_datetime),
      arrival_datetime: fromLocalInput(v.arrival_datetime),
      notes: v.notes,
      cost,
    }
    await onSubmit(entity)
  }

  const openPicker = (e: React.MouseEvent<HTMLInputElement>) => {
    try {
      e.currentTarget.showPicker?.()
    } catch {
      // ignore
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-8">
      {/* Transportation Type */}
      <div>
        <label className="block text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
          Transportation Type
        </label>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <div className="flex flex-wrap gap-3">
              {TRANSPORTATION_TYPES
                .filter((t) => (lockType ? t === field.value : true))
                .map((t) => {
                  const meta = TYPE_META[t]
                  const selected = field.value === t
                  const Icon = meta.Icon
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => !lockType && field.onChange(t)}
                      disabled={lockType}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all w-[5.5rem]",
                        selected
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:border-primary hover:bg-primary/5 hover:text-primary",
                        lockType && "cursor-default",
                      )}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-xs font-semibold">{meta.label}</span>
                    </button>
                  )
                })}
            </div>
          )}
        />
        {errors.type && (
          <p className="mt-1 text-xs text-destructive">{errors.type.message}</p>
        )}
      </div>

      {/* Input Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* From Location — Google Places Autocomplete */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-muted-foreground">
            From Location
          </label>
          <Controller
            control={control}
            name="from_location"
            render={({ field }) => (
              <LocationAutocomplete
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="e.g. Jakarta Airport"
                onPlaceSelect={(p) => {
                  field.onChange(p.location_name || p.address)
                }}
              />
            )}
          />
          {errors.from_location && (
            <p className="text-xs text-destructive">{errors.from_location.message}</p>
          )}
        </div>

        {/* To Location — Google Places Autocomplete */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-muted-foreground">
            To Location
          </label>
          <Controller
            control={control}
            name="to_location"
            render={({ field }) => (
              <LocationAutocomplete
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="e.g. Bali Airport"
                onPlaceSelect={(p) => {
                  field.onChange(p.location_name || p.address)
                }}
              />
            )}
          />
          {errors.to_location && (
            <p className="text-xs text-destructive">{errors.to_location.message}</p>
          )}
        </div>

        {/* Label / Flight Number */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-muted-foreground">
            Label / Flight Number
          </label>
          <div className="relative">
            <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
              placeholder="e.g. GA 420"
              {...register("label")}
            />
          </div>
          {errors.label && (
            <p className="text-xs text-destructive">{errors.label.message}</p>
          )}
        </div>

        {/* Departure */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-muted-foreground">
            Departure Time
          </label>
          <input
            type="datetime-local"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
            onClick={openPicker}
            {...register("departure_datetime")}
          />
          {errors.departure_datetime && (
            <p className="text-xs text-destructive">{errors.departure_datetime.message}</p>
          )}
        </div>

        {/* Arrival */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-muted-foreground">
            Arrival Time
          </label>
          <input
            type="datetime-local"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
            onClick={openPicker}
            {...register("arrival_datetime")}
          />
          {errors.arrival_datetime && (
            <p className="text-xs text-destructive">{errors.arrival_datetime.message}</p>
          )}
        </div>

      </div>

      {/* Operator */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-muted-foreground">
          Operator (optional)
        </label>
        <Input placeholder="e.g. Garuda Indonesia" {...register("operator")} />
      </div>

      {/* Cost field */}
      {withCost && (
        <div className="rounded-xl border border-dashed bg-muted/30 p-4">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Cost (optional — adds an expense to the trip budget)
          </Label>
          <div className="mt-3 grid grid-cols-[1fr_6rem] gap-3">
            <Input
              type="number"
              inputMode="decimal"
              placeholder="0"
              {...register("amount")}
            />
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <Select
                  value={field.value ?? defaultCurrency}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-muted-foreground">
          Notes (optional)
        </label>
        <Textarea rows={2} placeholder="Any additional details…" {...register("notes")} />
      </div>

      {/* Form actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving…
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              {initial ? "Save Changes" : "Save Transport"}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// Convert ISO 8601 from API (UTC) to <input type="datetime-local"> shape.
// The API stores datetime as UTC; we display it as-is (treating stored time
// as the "intended" local departure time, not converting to browser timezone).
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ""
  // Strip the Z/offset so the datetime is treated as local, not UTC
  // e.g. "2026-07-01T06:30:00Z" → "2026-07-01T06:30"
  const bare = iso.replace(/Z$|[+-]\d{2}:\d{2}$/, "")
  const d = new Date(bare)
  if (isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Convert datetime-local value back to RFC3339 for the API; empty → null.
// We send the time as UTC+00:00 (appending Z) so the backend stores the
// time exactly as entered by the user, without any timezone conversion.
function fromLocalInput(local: string | undefined): string | null {
  if (!local) return null
  // local is "YYYY-MM-DDTHH:mm" — treat as UTC by appending Z
  // This preserves the intended time value without shifting it.
  if (!/Z$|[+-]\d{2}:\d{2}$/.test(local)) {
    return local + ":00Z"
  }
  return local
}
