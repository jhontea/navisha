"use client"

import { SUPPORTED_CURRENCIES } from "@/lib/currency"
import { Input } from "@/components/ui/input"
import { Chip } from "@/components/Chip"
import { Controller, useForm } from "react-hook-form"
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
  type AccommodationType,
  type Accommodation,
  type CreateAccommodationInput,
} from "../types"

const TYPE_ICON: Record<AccommodationType, typeof Hotel> = {
  hotel: Hotel,
  hostel: Users,
  apartment: Home,
  other: HelpCircle,
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

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
    confirmation_number: z.string().max(200).optional(),
    notes: z.string().max(2000).optional(),
    amount: z.string().optional(),
    currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  })
  .refine((d) => new Date(d.check_out) >= new Date(d.check_in), {
    message: "Check-out must be on or after check-in",
    path: ["check_out"],
  })

type FormValues = z.infer<typeof schema>

interface Props {
  initial?: Accommodation
  tripBaseCurrency?: string
  withCost?: boolean
  onSubmit: (input: CreateAccommodationInput) => Promise<unknown>
  onCancel: () => void
  isSubmitting: boolean
}

export function AccommodationForm({
  initial,
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
    clearErrors,
    setValue,
    watch,
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
      confirmation_number: initial?.confirmation_number ?? "",
      notes: initial?.notes ?? "",
      amount: "",
      currency: defaultCurrency,
    },
  })

  const checkIn = watch("check_in")
  const checkOut = watch("check_out")
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
      confirmation_number: v.confirmation_number,
      notes: v.notes,
    }
    const amount = v.amount ? Number(v.amount) : 0
    const cost =
      withCost && amount > 0 && v.currency
        ? { amount, currency: v.currency }
        : null
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
                  "w-full pl-10 pr-4 py-2.5 rounded-xl border bg-card text-base focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-60",
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
                  onPlaceSelect={(p) => {
                    field.onChange(p.location_name || p.address)
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
            className="h-auto w-full pl-10 pr-4 py-2.5 rounded-xl border bg-card text-base focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-60"
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
            Adds an expense to the trip budget when an amount is entered.
          </FormFieldDescription>
          <div className="mt-3 grid grid-cols-[1fr_6rem] gap-3">
            {/* Hidden field for RHF */}
            <input {...register("amount")} type="hidden" />
            <Input
              type="text"
              inputMode="numeric"
              placeholder="0"
              defaultValue=""
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9.]/g, "")
                const parts = raw.split(".")
                const normalised = parts.length > 1 ? parts[0] + "." + parts.slice(1).join("") : raw
                const [intPart, decPart] = normalised.split(".")
                const formatted = intPart
                  ? Number(intPart).toLocaleString() + (decPart !== undefined ? "." + decPart : "")
                  : ""
                e.target.value = formatted
                setValue("amount", normalised || "", { shouldValidate: false })
              }}
              className="h-auto w-full px-4 py-2.5 rounded-xl border bg-card text-base focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
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
