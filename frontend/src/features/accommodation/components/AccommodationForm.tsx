"use client"

import { useState } from "react"
import { SUPPORTED_CURRENCIES } from "@/lib/currency"
import { costPayload, type LinkedCost } from "@/lib/linkedCost"
import { currencyDecimals, formatAmountInput, formatAmountValue, unformatAmountInput } from "@/lib/money"
import { Input } from "@/components/ui/input"
import { Chip } from "@/components/Chip"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Building2,
  Hash,
  Hotel,
  Home,
  Users,
  HelpCircle,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { FormField } from "@/components/forms/FormField"
import { FormActions } from "@/components/forms/FormActions"
import {
  FormFieldDescription,
  FormFieldError,
  FormFieldLabel,
  fieldDescriptionIds,
} from "@/components/forms/FormFieldState"
import { LocationAutocomplete } from "@/features/activity/components/LocationAutocomplete"
import { TravelDateRangePicker } from "@/features/trip/components/TravelDateRangePicker"
import {
  ACCOMMODATION_TYPES,
  ACCOMMODATION_TYPE_LABELS,
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
  type AccommodationType,
  type Accommodation,
  type CreateAccommodationInput,
} from "../types"
import { stayNameFromPlace } from "../lib/stayName"

const TYPE_ICON: Record<AccommodationType, typeof Hotel> = {
  hotel: Hotel,
  hostel: Users,
  apartment: Home,
  other: HelpCircle,
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/
const optionalClock = z.string().regex(CLOCK, "Use HH:MM").or(z.literal("")).optional()

const schema = z
  .object({
    accommodation_type: z
      .enum(["hotel", "hostel", "apartment", "other"])
      .optional(),
    name: z.string().min(1, "Name is required").max(200),
    location_name: z.string().max(200).optional(),
    lat: z.string().optional(),
    lng: z.string().optional(),
    google_place_id: z.string().optional(),
    check_in: z
      .string()
      .min(1, "Check-in is required")
      .regex(ISO_DATE, "Use the date picker"),
    check_out: z
      .string()
      .min(1, "Check-out is required")
      .regex(ISO_DATE, "Use the date picker"),
    check_in_time: optionalClock,
    check_out_time: optionalClock,
    confirmation_number: z.string().max(200).optional(),
    notes: z.string().max(2000).optional(),
    amount: z.string().optional(),
    currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  })
  .refine((d) => new Date(d.check_out) >= new Date(d.check_in), {
    message: "Check-out must be on or after check-in",
    path: ["check_out"],
  })
  .refine(
    (d) =>
      d.check_in !== d.check_out ||
      !d.check_in_time ||
      !d.check_out_time ||
      d.check_out_time >= d.check_in_time,
    { message: "Check-out must be after check-in", path: ["check_out_time"] },
  )

type FormValues = z.infer<typeof schema>

interface Props {
  initial?: Accommodation
  tripBaseCurrency?: string
  withCost?: boolean
  /** On edit: the cost already linked to this stay, to prefill. */
  initialCost?: LinkedCost | null
  onSubmit: (input: CreateAccommodationInput) => Promise<unknown>
  onCancel: () => void
  isSubmitting: boolean
  /** "YYYY-MM-DD" the date picker opens on (the trip's first day). */
  defaultDate?: string
  /** "YYYY-MM-DD" last day of the trip; with defaultDate it outlines the trip in the picker. */
  tripEnd?: string
  /** Trip destination, to bias the location search. */
  searchContext?: string
}

export function AccommodationForm({
  initial,
  tripBaseCurrency,
  withCost,
  initialCost,
  onSubmit,
  onCancel,
  isSubmitting,
  defaultDate,
  tripEnd,
  searchContext,
}: Props) {
  // A linked cost keeps the currency it was paid in.
  const costCurrency = SUPPORTED_CURRENCIES.find((c) => c === initialCost?.currency)
  const defaultCurrency = costCurrency ?? (tripBaseCurrency as FormValues["currency"]) ?? "IDR"
  const {
    register,
    handleSubmit,
    control,
    clearErrors,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      accommodation_type: initial?.accommodation_type ?? "hotel",
      name: initial?.name ?? "",
      location_name: initial?.location_name ?? "",
      lat: initial?.lat != null ? String(initial.lat) : "",
      lng: initial?.lng != null ? String(initial.lng) : "",
      google_place_id: initial?.google_place_id ?? "",
      check_in: initial?.check_in ?? "",
      check_out: initial?.check_out ?? "",
      check_in_time: initial?.check_in_time ?? "",
      check_out_time: initial?.check_out_time ?? "",
      confirmation_number: initial?.confirmation_number ?? "",
      notes: initial?.notes ?? "",
      amount: initialCost ? String(initialCost.amount) : "",
      currency: defaultCurrency,
    },
  })

  const costCurrencyNow = useWatch({ control, name: "currency" }) ?? defaultCurrency
  const [displayCost, setDisplayCost] = useState(
    initialCost ? formatAmountValue(initialCost.amount, currencyDecimals(defaultCurrency)) : "",
  )
  const checkIn = useWatch({ control, name: "check_in" })
  const checkOut = useWatch({ control, name: "check_out" })
  const stayNights = getStayNights(checkIn, checkOut)

  const submit = async (v: FormValues) => {
    const entity: CreateAccommodationInput = {
      accommodation_type: v.accommodation_type,
      name: v.name,
      location_name: v.location_name,
      lat: v.lat ? Number(v.lat) : null,
      lng: v.lng ? Number(v.lng) : null,
      google_place_id: v.google_place_id,
      check_in: v.check_in,
      check_out: v.check_out,
      check_in_time: v.check_in_time || null,
      check_out_time: v.check_out_time || null,
      confirmation_number: v.confirmation_number,
      notes: v.notes,
    }
    const cost = costPayload(v.amount, v.currency, !withCost ? "off" : initial ? "edit" : "add")
    await onSubmit({ ...entity, cost })
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6" aria-busy={isSubmitting}>
      <fieldset disabled={isSubmitting} className="space-y-6">
      {/* Stay Type Selector */}
      <div>
        <FormFieldLabel id="stay-type-label" className="mb-3 block">Stay type</FormFieldLabel>
        <Controller
          control={control}
          name="accommodation_type"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="stay-type-label">
              {ACCOMMODATION_TYPES.map((t) => {
                const selected = field.value === t
                const Icon = TYPE_ICON[t]
                return (
                  <Chip key={t} variant="option" pressed={selected} icon={Icon} onClick={() => field.onChange(t)}>
                    {ACCOMMODATION_TYPE_LABELS[t]}
                  </Chip>
                )
              })}
            </div>
          )}
        />
      </div>

      {/* Main fields grid */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Accommodation Name */}
          <div className="space-y-2">
            <FormFieldLabel htmlFor="stay-name" required>Stay name</FormFieldLabel>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="stay-name"
                aria-required="true"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "stay-name-error" : undefined}
                className={cn("h-auto", 
                  "w-full pl-10 pr-4 py-2.5 rounded-xl border bg-card text-base focus:border-primary focus:ring-1 focus:ring-primary outline-hidden transition-all disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-60",
                  errors.name ? "border-destructive ring-1 ring-destructive/20" : "border-border",
                )}
                placeholder="e.g. Park Hyatt Tokyo"
                {...register("name")}
              />
            </div>
            <FormFieldError id="stay-name-error">{errors.name?.message}</FormFieldError>
          </div>

          {/* Location — Google Places */}
          <div className="space-y-2">
            <FormFieldLabel htmlFor="stay-location" optional>Address / Location</FormFieldLabel>
            <Controller
              control={control}
              name="location_name"
              render={({ field }) => (
                <LocationAutocomplete
                  id="stay-location"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                  ariaInvalid={Boolean(errors.location_name)}
                  ariaDescribedBy={fieldDescriptionIds(
                    "stay-location-description",
                    "stay-location-error",
                    Boolean(errors.location_name),
                  )}
                  placeholder="Search for a location…"
                  searchContext={searchContext}
                  onPlaceSelect={(p) => {
                    field.onChange(p.location_name || p.address)
                    // The place is usually the stay itself: name it after it.
                    const name = stayNameFromPlace(getValues("name"), p)
                    if (name) setValue("name", name, { shouldDirty: true, shouldValidate: true })
                    setValue("lat", String(p.lat))
                    setValue("lng", String(p.lng))
                    setValue("google_place_id", p.google_place_id)
                  }}
                />
              )}
            />
            {/* Hidden lat/lng/place_id */}
            <input type="hidden" {...register("lat")} />
            <input type="hidden" {...register("lng")} />
            <input type="hidden" {...register("google_place_id")} />
            <FormFieldDescription id="stay-location-description">
              Search and select a place to keep its map location.
            </FormFieldDescription>
            <FormFieldError id="stay-location-error">{errors.location_name?.message}</FormFieldError>
          </div>
        </div>

        {/* Check-in and check-out use the same two-click range interaction. */}
        <div className="space-y-2">
          <input type="hidden" {...register("check_in")} />
          <input type="hidden" {...register("check_out")} />
          <TravelDateRangePicker
            required
            startDate={checkIn}
            endDate={checkOut}
            duration={stayNights}
            durationUnit="night"
            defaultMonth={defaultDate}
            highlightRange={defaultDate && tripEnd ? { start: defaultDate, end: tripEnd } : undefined}
            label="Stay dates"
            emptyText="Select check-in and check-out"
            endText="Select check-out"
            startHint="Choose your check-in date"
            endHint="Choose your check-out date"
            hasError={Boolean(errors.check_in || errors.check_out)}
            errorId="stay-dates-error"
            disabled={isSubmitting}
            onChange={(range, complete) => {
              clearErrors(["check_in", "check_out"])
              setValue("check_in", range.startDate, {
                shouldDirty: true,
                shouldValidate: complete,
              })
              setValue("check_out", range.endDate, {
                shouldDirty: true,
                shouldValidate: complete,
              })
            }}
          />
          {(errors.check_in || errors.check_out) && (
            <FormFieldError id="stay-dates-error">
              {errors.check_in?.message || errors.check_out?.message}
            </FormFieldError>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
          <FormField
            label="Check-in time"
            htmlFor="stay-check-in-time"
            optional
            error={errors.check_in_time?.message}
            errorId="stay-check-in-time-error"
          >
            <Input
              id="stay-check-in-time"
              type="time"
              aria-invalid={Boolean(errors.check_in_time)}
              aria-describedby={fieldDescriptionIds("stay-times-description", "stay-check-in-time-error", Boolean(errors.check_in_time))}
              {...register("check_in_time")}
            />
          </FormField>
          <FormField
            label="Check-out time"
            htmlFor="stay-check-out-time"
            optional
            error={errors.check_out_time?.message}
            errorId="stay-check-out-time-error"
          >
            <Input
              id="stay-check-out-time"
              type="time"
              aria-invalid={Boolean(errors.check_out_time)}
              aria-describedby={fieldDescriptionIds("stay-times-description", "stay-check-out-time-error", Boolean(errors.check_out_time))}
              {...register("check_out_time")}
            />
          </FormField>
          <FormFieldDescription id="stay-times-description" className="min-[380px]:col-span-2">
            Leave empty for the usual {DEFAULT_CHECK_IN_TIME} check-in and {DEFAULT_CHECK_OUT_TIME} check-out.
          </FormFieldDescription>
        </div>
      </div>

      {/* Confirmation Number */}
      <div className="space-y-2">
        <FormFieldLabel htmlFor="stay-confirmation" optional>Confirmation number</FormFieldLabel>
        <div className="relative">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="stay-confirmation"
            aria-invalid={Boolean(errors.confirmation_number)}
            aria-describedby={errors.confirmation_number ? "stay-confirmation-error" : undefined}
            className="h-auto w-full pl-10 pr-4 py-2.5 rounded-xl border bg-card text-base focus:border-primary focus:ring-1 focus:ring-primary outline-hidden transition-all disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-60"
            placeholder="Optional: 1234-ABCD"
            {...register("confirmation_number")}
          />
        </div>
        <FormFieldError id="stay-confirmation-error">{errors.confirmation_number?.message}</FormFieldError>
      </div>

      {/* Cost field */}
      {withCost && (
        <div className="rounded-2xl bg-muted p-4">
          <FormFieldLabel optional className="text-sm">Cost</FormFieldLabel>
          <FormFieldDescription className="mt-1">
            {initial
              ? "Kept as an expense in the trip budget. Clear the amount to remove it."
              : "Adds an expense to the trip budget when an amount is entered."}
          </FormFieldDescription>
          <div className="mt-3 grid grid-cols-[1fr_6rem] gap-3">
            {/* Hidden field for RHF */}
            <input {...register("amount")} type="hidden" />
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0"
              aria-label="Cost amount"
              value={displayCost}
              onChange={(e) => {
                const formatted = formatAmountInput(e.target.value, currencyDecimals(costCurrencyNow))
                setDisplayCost(formatted)
                setValue("amount", unformatAmountInput(formatted), { shouldValidate: false })
              }}
              className="h-auto w-full px-4 py-2.5 rounded-xl border bg-card text-base focus:border-primary focus:ring-1 focus:ring-primary outline-hidden transition-all"
            />
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <Select
                  value={field.value ?? defaultCurrency}
                  onValueChange={(c) => {
                    field.onChange(c)
                    // Re-cut what was typed to the new currency's decimals.
                    const formatted = formatAmountInput(displayCost, currencyDecimals(c ?? defaultCurrency))
                    setDisplayCost(formatted)
                    setValue("amount", unformatAmountInput(formatted), { shouldValidate: false })
                  }}
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
        <FormFieldLabel htmlFor="stay-notes" optional>Notes</FormFieldLabel>
        <Textarea
          id="stay-notes"
          rows={2}
          placeholder="Any additional details…"
          aria-invalid={Boolean(errors.notes)}
          aria-describedby={errors.notes ? "stay-notes-error" : undefined}
          {...register("notes")}
        />
        <FormFieldError id="stay-notes-error">{errors.notes?.message}</FormFieldError>
      </div>

      {/* Form actions */}
      <FormActions onCancel={onCancel} isSubmitting={isSubmitting} submitLabel={initial ? "Save changes" : "Save stay"} />
      </fieldset>
    </form>
  )
}

function getStayNights(checkIn: string, checkOut: string) {
  if (!ISO_DATE.test(checkIn) || !ISO_DATE.test(checkOut)) return null

  const start = Date.parse(`${checkIn}T00:00:00Z`)
  const end = Date.parse(`${checkOut}T00:00:00Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return null
  }

  return Math.floor((end - start) / 86_400_000)
}
