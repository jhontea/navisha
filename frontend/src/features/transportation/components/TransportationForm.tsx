"use client"

import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Bus,
  Car,
  ChevronDown,
  Hash,
  Plane,
  Ship,
  SlidersHorizontal,
  Ticket,
  Train,
  TramFront,
  Boxes,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  FormFieldDescription,
  FormFieldError,
  FormFieldLabel,
} from "@/components/forms/FormFieldState"
import { LocationAutocomplete } from "@/features/activity/components/LocationAutocomplete"
import { TransportationScheduleFields } from "./TransportationScheduleFields"
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

const schema = z
  .object({
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
  .superRefine((values, context) => {
    if (
      values.arrival_datetime &&
      values.departure_datetime &&
      values.arrival_datetime < values.departure_datetime
    ) {
      context.addIssue({
        code: "custom",
        path: ["arrival_datetime"],
        message: "Arrival must be after departure",
      })
    }
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
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(
    Boolean(
      initial?.label ||
      initial?.operator ||
      initial?.reference_number ||
      initial?.notes,
    ),
  )
  const {
    register,
    handleSubmit,
    control,
    setValue,
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

  // Watch schedule fields so the grouped editor stays in sync with RHF.
  void watch("type")
  const departureDateTime = watch("departure_datetime")
  const arrivalDateTime = watch("arrival_datetime") ?? ""
  const optionalValues = watch(["label", "operator", "reference_number", "amount", "notes"])
  const additionalDetailCount = optionalValues.filter((value) => Boolean(value?.trim())).length

  useEffect(() => {
    if (
      errors.label ||
      errors.operator ||
      errors.reference_number ||
      errors.amount ||
      errors.currency ||
      errors.notes
    ) {
      setShowAdditionalDetails(true)
    }
  }, [errors.amount, errors.currency, errors.label, errors.notes, errors.operator, errors.reference_number])

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
      reference_number: v.reference_number,
      from_location: v.from_location,
      to_location: v.to_location,
      departure_datetime: fromLocalInput(v.departure_datetime),
      arrival_datetime: fromLocalInput(v.arrival_datetime),
      notes: v.notes,
      cost,
    }
    await onSubmit(entity)
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-8" aria-busy={isSubmitting}>
      <fieldset disabled={isSubmitting} className="space-y-8">
      {/* Transportation Type */}
      <div>
        <FormFieldLabel required className="mb-3 block uppercase tracking-wider">
          Transportation Type
        </FormFieldLabel>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
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
                      aria-pressed={selected}
                      onClick={() => !lockType && field.onChange(t)}
                      disabled={lockType}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all",
                        "font-label-md text-sm",
                        selected
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40",
                        lockType && "cursor-default",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          selected ? "text-primary" : "text-muted-foreground",
                        )}
                        aria-hidden="true"
                      />
                      {meta.label}
                    </button>
                  )
                })}
            </div>
          )}
        />
        <FormFieldError className="mt-1">{errors.type?.message}</FormFieldError>
      </div>

      {/* Input Grid */}
      <div className="space-y-6">
        {/* Route stays visible as a core field. */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          {/* From Location — Google Places Autocomplete */}
          <div className="space-y-2">
            <FormFieldLabel required>From Location</FormFieldLabel>
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
            <FormFieldError>{errors.from_location?.message}</FormFieldError>
          </div>

          {/* To Location — Google Places Autocomplete */}
          <div className="space-y-2">
            <FormFieldLabel required>To Location</FormFieldLabel>
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
            <FormFieldError>{errors.to_location?.message}</FormFieldError>
          </div>
        </div>

        <input type="hidden" {...register("departure_datetime")} />
        <input type="hidden" {...register("arrival_datetime")} />
        <TransportationScheduleFields
          departure={departureDateTime}
          arrival={arrivalDateTime}
          disabled={isSubmitting}
          departureError={errors.departure_datetime?.message}
          arrivalError={errors.arrival_datetime?.message}
          onDepartureChange={(value) =>
            setValue("departure_datetime", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          onArrivalChange={(value) =>
            setValue("arrival_datetime", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </div>

      {/* Optional fields stay out of the primary completion path. */}
      <section className="overflow-hidden rounded-xl border border-border/70 bg-muted/10">
        <button
          type="button"
          aria-expanded={showAdditionalDetails}
          aria-controls="transport-additional-details"
          onClick={() => setShowAdditionalDetails((open) => !open)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">Additional details</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Label, operator, booking reference, cost, and notes
            </span>
          </span>
          {additionalDetailCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {additionalDetailCount}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              showAdditionalDetails && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>

        {showAdditionalDetails && (
          <div
            id="transport-additional-details"
            className="space-y-5 border-t border-border/60 bg-background/50 p-4"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <FormFieldLabel htmlFor="transport-label" optional>Transport label</FormFieldLabel>
                <div className="relative">
                  <Ticket className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <input
                    id="transport-label"
                    aria-invalid={Boolean(errors.label)}
                    aria-describedby={errors.label ? "transport-label-error" : undefined}
                    className={cn(
                      "w-full rounded-lg border bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-60",
                      errors.label ? "border-destructive ring-1 ring-destructive/20" : "border-border",
                    )}
                    placeholder="e.g. GA 420 or Airport shuttle"
                    {...register("label")}
                  />
                </div>
                <FormFieldError id="transport-label-error">{errors.label?.message}</FormFieldError>
              </div>

              <div className="space-y-2">
                <FormFieldLabel htmlFor="transport-operator" optional>Operator</FormFieldLabel>
                <Input id="transport-operator" placeholder="e.g. Garuda Indonesia" {...register("operator")} />
                <FormFieldError>{errors.operator?.message}</FormFieldError>
              </div>

              <div className="space-y-2 md:col-span-2">
                <FormFieldLabel htmlFor="transport-reference" optional>Booking reference</FormFieldLabel>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="transport-reference"
                    className="pl-10"
                    placeholder="e.g. ABC123 or e-ticket number"
                    aria-invalid={Boolean(errors.reference_number)}
                    {...register("reference_number")}
                  />
                </div>
                <FormFieldError>{errors.reference_number?.message}</FormFieldError>
              </div>
            </div>

            {withCost && (
              <div className="rounded-xl border border-dashed bg-muted/30 p-4">
                <FormFieldLabel optional className="text-xs uppercase tracking-wider">Cost</FormFieldLabel>
                <FormFieldDescription className="mt-1">
                  Adds an expense to the trip budget when an amount is entered.
                </FormFieldDescription>
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
                        <SelectTrigger aria-label="Cost currency">
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

            <div className="space-y-2">
              <FormFieldLabel htmlFor="transport-notes" optional>Notes</FormFieldLabel>
              <Textarea
                id="transport-notes"
                rows={3}
                placeholder="Terminal, check-in instructions, or other details…"
                aria-invalid={Boolean(errors.notes)}
                {...register("notes")}
              />
              <FormFieldError>{errors.notes?.message}</FormFieldError>
            </div>
          </div>
        )}
      </section>

      {/* Form actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-chromatic-sunset via-chromatic-aurora to-chromatic-sky text-white font-semibold px-5 py-2.5 rounded-xl shadow-md shadow-chromatic-sunset/20 transition-all active:scale-95 disabled:opacity-60 bg-[length:200%_200%] bg-[position:0%_50%] hover:bg-[position:100%_50%] transition-[background-position] duration-500"
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
          className="px-5 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      </fieldset>
    </form>
  )
}

// Convert a stored datetime string to <input type="datetime-local"> shape.
// The DB stores TIMESTAMPTZ as e.g. "2026-05-10T06:30:00+00:00".
// We strip the timezone suffix so the input shows the wall-clock digits (06:30).
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ""
  // Strip seconds and any tz suffix:
  // "2026-05-10T06:30:00+00:00" → "2026-05-10T06:30"
  // "2026-05-10T06:30:00Z"      → "2026-05-10T06:30"
  // "2026-05-10T06:30:00"       → "2026-05-10T06:30"
  return iso
    .replace(/Z$|[+-]\d{2}:\d{2}$/, "") // remove tz offset
    .replace(/:\d{2}(\.\d+)?$/, "")      // remove seconds (and ms)
}

// Convert datetime-local value to RFC3339 for the API.
// The backend parseOptTime uses time.Parse(time.RFC3339) which requires a tz offset.
// We append Z (UTC) so "2026-05-10T06:30" → "2026-05-10T06:30:00Z".
// The DB stores this as 06:30 UTC. Display code extracts T06:30 literally → "06:30". ✓
function fromLocalInput(local: string | undefined): string | null {
  if (!local) return null
  // "YYYY-MM-DDTHH:mm" (16 chars) → add seconds + Z
  const withSec = local.length === 16 ? local + ":00" : local
  // Ensure Z suffix for RFC3339
  return withSec.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(withSec)
    ? withSec
    : withSec + "Z"
}
