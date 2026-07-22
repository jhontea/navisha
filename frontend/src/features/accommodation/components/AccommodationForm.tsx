"use client"

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
import { TravelDateRangePicker } from "@/features/trip/components/TravelDateRangePicker"
import {
  ACCOMMODATION_TYPES,
  ACCOMMODATION_TYPE_LABELS,
  type AccommodationType,
  type Accommodation,
  type CreateAccommodationInput,
} from "../types"

const SUPPORTED_CURRENCIES = ["IDR", "USD", "JPY", "SGD", "KRW", "MYR", "THB", "EUR", "VND"] as const

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
    <form onSubmit={handleSubmit(submit)} className="space-y-8">
      {/* Stay Type Selector */}
      <div>
        <label className="font-label-md text-muted-foreground mb-4 uppercase tracking-wider">
          Stay Type
        </label>
        <Controller
          control={control}
          name="accommodation_type"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {ACCOMMODATION_TYPES.map((t) => {
                const selected = field.value === t
                const Icon = TYPE_ICON[t]
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => field.onChange(t)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all",
                      "font-label-md text-sm",
                      selected
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        selected ? "text-primary" : "text-muted-foreground",
                      )}
                      aria-hidden="true"
                    />
                    {ACCOMMODATION_TYPE_LABELS[t]}
                  </button>
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
            <label className="font-label-md text-muted-foreground">
              Accommodation Name
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                placeholder="e.g. Park Hyatt Tokyo"
                {...register("name")}
              />
            </div>
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Location — Google Places */}
          <div className="space-y-2">
            <label className="font-label-md text-muted-foreground">
              Address / Location
            </label>
            <Controller
              control={control}
              name="location_name"
              render={({ field }) => (
                <LocationAutocomplete
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Search for a location..."
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
          </div>
        </div>

        {/* Check-in and check-out use the same two-click range interaction. */}
        <div className="space-y-2">
          <input type="hidden" {...register("check_in")} />
          <input type="hidden" {...register("check_out")} />
          <TravelDateRangePicker
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
            <p id="stay-dates-error" className="text-xs text-destructive">
              {errors.check_in?.message || errors.check_out?.message}
            </p>
          )}
        </div>
      </div>

      {/* Confirmation Number */}
      <div className="space-y-2">
        <label className="font-label-md text-muted-foreground">
          Confirmation Number (optional)
        </label>
        <div className="relative">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            placeholder="Optional: 1234-ABCD"
            {...register("confirmation_number")}
          />
        </div>
      </div>

      {/* Cost field */}
      {withCost && (
        <div className="rounded-xl border border-dashed bg-muted/30 p-4">
          <Label className="font-label-md text-xs text-muted-foreground uppercase tracking-wider">
            Cost (optional — adds an expense to the trip budget)
          </Label>
          <div className="mt-3 grid grid-cols-[1fr_6rem] gap-3">
            {/* Hidden field for RHF */}
            <input {...register("amount")} type="hidden" />
            <input
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
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
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
        <label className="font-label-md text-muted-foreground">
          Notes (optional)
        </label>
        <Textarea rows={2} placeholder="Any additional details…" {...register("notes")} />
      </div>

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
              {initial ? "Save Changes" : "Save Stay"}
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
