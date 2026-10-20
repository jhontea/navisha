"use client"

import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/NativeSelect"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { useState, type ReactNode } from "react"
import { ChevronDown, MapPin, Sparkles } from "lucide-react"
import { useSupportedCurrencies } from "@/features/currency/hooks/useCurrency"
import { getCurrencyLabel, getCurrencySymbol } from "@/lib/currency"
import { currencyDecimals, formatAmountInput, formatAmountValue, unformatAmountInput } from "@/lib/money"
import {
  FormFieldDescription,
  FormFieldError,
  FormFieldLabel,
  fieldDescriptionIds,
} from "@/components/forms/FormFieldState"
import { FormActions } from "@/components/forms/FormActions"
import { Button } from "@/components/ui/button"
import { getInclusiveDayCount } from "../lib/dates"
import { cn } from "@/lib/utils"
import type { CreateTripInput, Trip } from "../types"
import { canRenderTripCover, getDefaultTripCover } from "../lib/cover"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const DestinationAutocomplete = dynamic(
  () => import("./DestinationAutocomplete").then((module) => module.DestinationAutocomplete),
  {
    ssr: false,
    loading: () => <div className="h-12 w-full animate-pulse rounded-lg border bg-muted/30" aria-hidden="true" />,
  },
)

const TravelDateRangePicker = dynamic(
  () => import("./TravelDateRangePicker").then((module) => module.TravelDateRangePicker),
  {
    ssr: false,
    loading: () => <div className="h-20 animate-pulse rounded-xl bg-muted/30" aria-hidden="true" />,
  },
)

const schema = z
  .object({
    title: z.string().min(1, { message: "Title is required" }).max(120),
    destination: z.string().max(200).optional(),
    start_date: z
      .string()
      .min(1, { message: "Start date is required" })
      .regex(ISO_DATE, { message: "Use the date picker (YYYY-MM-DD)" }),
    end_date: z
      .string()
      .min(1, { message: "End date is required" })
      .regex(ISO_DATE, { message: "Use the date picker (YYYY-MM-DD)" }),
    base_currency: z.string().min(1, { message: "Currency is required" }),
    budget: z
      .string()
      .optional()
      .refine((v) => !v || Number(unformatAmountInput(v)) >= 0, "Budget must be 0 or more"),
    notes: z.string().max(2000).optional(),
  })
  .refine((d) => new Date(d.end_date) >= new Date(d.start_date), {
    message: "End date must be on or after start date",
    path: ["end_date"],
  })

type FormValues = z.infer<typeof schema>

interface Props {
  initial?: Trip
  onSubmit: (input: CreateTripInput) => Promise<unknown>
  isSubmitting: boolean
  submitLabel?: string
}

// Form field shape shared with Input (44px, rounded-xl, card fill; 16px text).
const inputBase =
  "h-11 w-full rounded-xl border bg-card px-4 text-base text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive"

// Icon/prefix + divider + bare input sharing one bordered, focus-ringed shell.
function InputGroup({ prefix, invalid, children }: { prefix: ReactNode; invalid: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-center rounded-xl border bg-card transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary",
        invalid && "border-destructive",
      )}
    >
      <div className="flex shrink-0 items-center justify-center px-4">{prefix}</div>
      <span className="h-6 w-px shrink-0 bg-border" />
      {children}
    </div>
  )
}

export function TripForm({ initial, onSubmit, isSubmitting, submitLabel }: Props) {
  const router = useRouter()
  // Preserve an existing cover until the user explicitly removes it.
  const [coverPreview, setCoverPreview] = useState<string | null>(
    initial?.cover_image_url ?? null
  )


  const { data: currencyData, isLoading: currenciesLoading } = useSupportedCurrencies()
  const currencies = currencyData?.supported ?? []

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
    defaultValues: buildDefaults(initial),
  })

  const startDate = useWatch({ control, name: "start_date" })
  const endDate = useWatch({ control, name: "end_date" })
  const tripDuration = getInclusiveDayCount(startDate, endDate)
  const destination = useWatch({ control, name: "destination" })
  const baseCurrency = useWatch({ control, name: "base_currency" })

  const continueWithAI = () => {
    const params = new URLSearchParams()
    if (destination?.trim()) params.set("destination", destination.trim())
    if (startDate) params.set("start_date", startDate)
    if (endDate) params.set("end_date", endDate)
    if (baseCurrency) params.set("base_currency", baseCurrency)

    const query = params.toString()
    router.push(query ? `/trips/generate?${query}` : "/trips/generate")
  }

  const submit = async (values: FormValues) => {
    await onSubmit({
      title: values.title,
      description: values.destination ?? "",
      start_date: values.start_date,
      end_date: values.end_date,
      base_currency: values.base_currency,
      budget: values.budget ? Number(unformatAmountInput(values.budget)) : 0,
      cover_image_url:
        coverPreview && !coverPreview.startsWith("blob:")
          ? coverPreview
          : getDefaultTripCover(values.destination),
      // No field edits notes; pass the existing value through so saving an edit keeps it.
      notes: values.notes ?? "",
    })
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5" aria-busy={isSubmitting}>
      <fieldset disabled={isSubmitting} className="space-y-5">
        {/* Trip Title */}
        <div className="space-y-1.5">
          <FormFieldLabel htmlFor="trip-title" required>Title</FormFieldLabel>
          <Input
            variant="bare"
            id="trip-title"
            aria-required="true"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "trip-title-error" : undefined}
            className={`${inputBase} ${errors.title ? "border-destructive focus:ring-destructive/30" : ""}`}
            placeholder="e.g., Summer in Tokyo"
            {...register("title")}
          />
          <FormFieldError id="trip-title-error">{errors.title?.message}</FormFieldError>
        </div>

        {/* Destination */}
        <div className="space-y-1.5">
          <FormFieldLabel htmlFor="destination" optional>Destination</FormFieldLabel>
          <InputGroup
            invalid={Boolean(errors.destination)}
            prefix={<MapPin className="pointer-events-none h-5 w-5 text-muted-foreground" aria-hidden="true" />}
          >
            {/* Google Places autocomplete (city/province/country only) */}
            <Controller
              name="destination"
              control={control}
              render={({ field }) => (
                <DestinationAutocomplete
                  id="destination"
                  // The wrapper draws the field border; the inner input stays bare.
                  className="h-11 flex-1 rounded-none border-0 bg-transparent px-4 text-base text-foreground outline-hidden placeholder:text-muted-foreground focus-visible:ring-0"
                  placeholder="Search city, province, or country"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                  ariaInvalid={Boolean(errors.destination)}
                  ariaDescribedBy={fieldDescriptionIds(
                    "trip-destination-description",
                    "trip-destination-error",
                    Boolean(errors.destination),
                  )}
                  onSelect={(place) => {
                    field.onChange(place.description)
                  }}
                />
              )}
            />
          </InputGroup>
          <FormFieldError id="trip-destination-error">{errors.destination?.message}</FormFieldError>
          <FormFieldDescription id="trip-destination-description">
            Pick a city, province, or country from the location suggestions.
          </FormFieldDescription>

          {/* Existing cover preview */}
          {canRenderTripCover(coverPreview) && (
            <div className="relative mt-2 h-32 w-full overflow-hidden rounded-2xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverPreview}
                alt="Trip cover preview"
                className="h-full w-full object-cover"
                onError={() => setCoverPreview(null)}
              />
              <Button type="button" variant="secondary" size="xs" onClick={() => setCoverPreview(null)} className="absolute right-2 top-2">
                Remove cover
              </Button>
            </div>
          )}
        </div>

        {/* A single field opens one calendar; first click starts the range. */}
        <div className="space-y-1.5">
          <input type="hidden" {...register("start_date")} />
          <input type="hidden" {...register("end_date")} />
          <FormFieldLabel htmlFor="travel-dates" required>Travel dates</FormFieldLabel>
          <TravelDateRangePicker
            id="travel-dates"
            hideLabel
            required
            startDate={startDate}
            endDate={endDate}
            duration={tripDuration}
            hasError={Boolean(errors.start_date || errors.end_date)}
            errorId="travel-dates-error"
            onChange={(range, complete) => {
              clearErrors(["start_date", "end_date"])
              setValue("start_date", range.startDate, {
                shouldDirty: true,
                shouldValidate: complete,
              })
              setValue("end_date", range.endDate, {
                shouldDirty: true,
                shouldValidate: complete,
              })
            }}
          />
          <FormFieldError id="travel-dates-error">
            {errors.start_date?.message || errors.end_date?.message}
          </FormFieldError>
        </div>

        {!initial && (
          <p className="-mt-2 flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
            Prefer an AI draft?
            <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={continueWithAI}>
              <Sparkles aria-hidden="true" />
              Generate with AI
            </Button>
          </p>
        )}

        {/* Base Currency — from backend */}
        <div className="space-y-1.5">
          <FormFieldLabel htmlFor="currency" required>Base currency</FormFieldLabel>
          <div className="relative">
            <Controller
              name="base_currency"
              control={control}
              render={({ field }) => (
                <NativeSelect
                  id="currency"
                  value={field.value}
                  onChange={(e) => {
                    field.onChange(e)
                    // Re-cut a typed budget to the new currency's decimals.
                    setValue("budget", formatAmountInput(getValues("budget") ?? "", currencyDecimals(e.target.value)))
                  }}
                  disabled={currenciesLoading}
                  aria-required="true"
                  aria-invalid={Boolean(errors.base_currency)}
                  aria-describedby={errors.base_currency ? "trip-currency-error" : undefined}
                  className={`${inputBase} appearance-none pr-10 ${
                    errors.base_currency ? "border-destructive" : "border-border"
                  } disabled:opacity-60`}
                >
                  {currenciesLoading ? (
                    <option value="">Loading currencies…</option>
                  ) : (
                    currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {getCurrencyLabel(c.code, c.name)}
                      </option>
                    ))
                  )}
                </NativeSelect>
              )}
            />
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          <FormFieldError id="trip-currency-error">{errors.base_currency?.message}</FormFieldError>
        </div>

        {/* Budget (optional) — prefixed with the chosen base currency */}
        <div className="space-y-1.5">
          <FormFieldLabel htmlFor="budget" optional>Budget</FormFieldLabel>
          <InputGroup
            invalid={Boolean(errors.budget)}
            prefix={<span className="min-w-8 text-center text-sm font-semibold text-muted-foreground">{getCurrencySymbol(baseCurrency)}</span>}
          >
            <Input
              id="budget"
              type="text"
              inputMode="decimal"
              aria-invalid={Boolean(errors.budget)}
              aria-describedby={errors.budget ? "trip-budget-error" : "trip-budget-description"}
              className="h-11 flex-1 rounded-none border-0 bg-transparent px-4 text-base text-foreground outline-hidden placeholder:text-muted-foreground focus-visible:ring-0"
              placeholder="e.g., 10,000,000"
              {...register("budget", {
                onChange: (e) => {
                  e.target.value = formatAmountInput(e.target.value, currencyDecimals(baseCurrency))
                },
                setValueAs: (v) => (v ? unformatAmountInput(String(v)) : ""),
              })}
            />
          </InputGroup>
          <FormFieldDescription id="trip-budget-description">
            Set a total budget to track spending vs remaining.
          </FormFieldDescription>
          <FormFieldError id="trip-budget-error">{errors.budget?.message}</FormFieldError>
        </div>

        {/* Form Actions */}
        <FormActions
          onCancel={() => router.back()}
          isSubmitting={isSubmitting}
          submittingLabel={initial ? "Saving…" : "Creating…"}
          submitLabel={submitLabel ?? (initial ? "Save changes" : "Create trip")}
        />
      </fieldset>
    </form>
  )
}

function buildDefaults(initial?: Trip): FormValues {
  if (!initial) {
    return {
      title: "",
      destination: "",
      start_date: "",
      end_date: "",
      base_currency: "IDR",
      budget: "",
      notes: "",
    }
  }
  return {
    title: initial.title,
    destination: initial.description ?? "",
    start_date: initial.start_date,
    end_date: initial.end_date,
    base_currency: initial.base_currency ?? "IDR",
    budget: initial.budget ? formatAmountValue(initial.budget, currencyDecimals(initial.base_currency ?? "IDR")) : "",
    notes: initial.notes ?? "",
  }
}
