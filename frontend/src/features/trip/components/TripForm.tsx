"use client"

import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Loader2,
  MapPin,
  Plus,
} from "lucide-react"
import { useSupportedCurrencies } from "@/features/currency/hooks/useCurrency"
import { getCurrencyLabel } from "@/lib/currency"
import { DestinationAutocomplete } from "./DestinationAutocomplete"
import {
  getInclusiveDayCount,
  TravelDateRangePicker,
} from "./TravelDateRangePicker"
import type { CreateTripInput, Trip } from "../types"
import { primaryTripActionButtonClassName } from "../lib/styles"
import { canRenderTripCover } from "../lib/cover"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

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
      .refine((v) => !v || Number(v) >= 0, "Budget must be 0 or more"),
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

const inputBase = "input-base"

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
    watch,
    formState: { errors },
  } = useForm<FormValues>({

    resolver: zodResolver(schema),
    defaultValues: buildDefaults(initial),
  })

  const startDate = watch("start_date")
  const endDate = watch("end_date")
  const tripDuration = getInclusiveDayCount(startDate, endDate)

  const submit = async (values: FormValues) => {
    await onSubmit({
      title: values.title,
      description: values.destination ?? "",
      start_date: values.start_date,
      end_date: values.end_date,
      base_currency: values.base_currency,
      budget: values.budget ? Number(values.budget) : 0,
      cover_image_url: coverPreview && !coverPreview.startsWith("blob:") ? coverPreview : "",
      notes: values.notes ?? "",
    })
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5">
      {/* Trip Title */}
      <div className="space-y-1.5">
        <label className="font-label-md text-muted-foreground" htmlFor="trip-title">
          Trip Title <span className="text-destructive" aria-hidden="true">*</span>
        </label>
        <input
          id="trip-title"
          className={`${inputBase} ${errors.title ? "border-destructive focus:ring-destructive/30" : "border-border/50"}`}
          placeholder="e.g., Summer in Tokyo"
          {...register("title")}
        />
        {errors.title && (
          <p className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            {errors.title.message}
          </p>
        )}
      </div>

      {/* Destination */}
      <div className="space-y-1.5">
        <label className="font-label-md text-muted-foreground" htmlFor="destination">
          Destination
        </label>
        <div className="flex items-center rounded-lg border bg-background transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary"
          style={{ borderColor: errors.destination ? 'hsl(var(--error))' : undefined }}
        >
          {/* Icon area */}
          <div className="flex items-center justify-center px-4 shrink-0">
            <MapPin className="h-5 w-5 text-muted-foreground pointer-events-none" aria-hidden="true" />
          </div>
          {/* Divider */}
          <span className="h-6 w-px bg-border shrink-0" />
          {/* Input — Google Places autocomplete (city/province/country only) */}
          <Controller
            name="destination"
            control={control}
            render={({ field }) => (
              <DestinationAutocomplete
                id="destination"
                className="flex-1 px-4 py-3 bg-transparent border-0 outline-none font-body-md text-body-md text-foreground placeholder:text-muted-foreground/50"
                placeholder="Search city, province, or country"
                value={field.value ?? ""}
                onChange={field.onChange}
                onSelect={(place) => {
                  field.onChange(place.description)
                }}
              />
            )}
          />
        </div>
        {errors.destination && (
          <p className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            {errors.destination.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Pick a city, province, or country from the location suggestions.
        </p>

        {/* Existing cover preview */}
        {canRenderTripCover(coverPreview) && (
          <div className="relative mt-2 h-32 w-full overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverPreview}
              alt="Trip cover preview"
              className="h-full w-full object-cover"
              onError={() => setCoverPreview(null)}
            />
            <button
              type="button"
              onClick={() => setCoverPreview(null)}
              className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-1 text-xs font-medium text-white hover:bg-black/70"
            >
              Remove
            </button>
          </div>
        )}
      </div>



      {/* A single field opens one calendar; first click starts the range. */}
      <fieldset className="space-y-1.5">
        <legend className="sr-only">
          Travel dates <span aria-hidden="true">*</span>
        </legend>
        <input type="hidden" {...register("start_date")} />
        <input type="hidden" {...register("end_date")} />
        <TravelDateRangePicker
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
        {(errors.start_date || errors.end_date) && (
          <p
            id="travel-dates-error"
            className="flex items-center gap-1 text-xs text-destructive"
          >
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            {errors.start_date?.message || errors.end_date?.message || "Please select both dates"}
          </p>
        )}
      </fieldset>

      {/* Budget (optional) */}
      <div className="space-y-1.5">
        <label className="font-label-md text-muted-foreground" htmlFor="budget">
          Budget{" "}
          <span className="font-normal text-xs text-muted-foreground/70">(optional)</span>
        </label>
        <div className="flex items-center rounded-lg border bg-background transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden"
          style={{ borderColor: errors.budget ? 'hsl(var(--error))' : undefined }}
        >
          <div className="flex items-center justify-center px-4 shrink-0">
            <CreditCard className="h-5 w-5 text-muted-foreground pointer-events-none" aria-hidden="true" />
          </div>
          <span className="h-6 w-px bg-border shrink-0" />
          <input
            id="budget"
            type="text"
            inputMode="numeric"
            className="flex-1 px-4 py-3 bg-transparent border-0 outline-none font-body-md text-body-md text-foreground placeholder:text-muted-foreground/50"
            placeholder="e.g., 10,000,000"
            {...register("budget", {
              onChange: (e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "")
                e.target.value = raw ? Number(raw).toLocaleString() : ""
                return raw
              },
              setValueAs: (v) => v ? String(Number(String(v).replace(/[^0-9]/g, ""))) : "",
            })}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Set a total budget to track spending vs remaining.
        </p>
        {errors.budget && (
          <p className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            {errors.budget.message}
          </p>
        )}
      </div>

      {/* Base Currency — from backend */}
      <div className="space-y-1.5">
        <label className="font-label-md text-muted-foreground" htmlFor="currency">
          Base Currency <span className="text-destructive" aria-hidden="true">*</span>
        </label>
        <div className="relative">
          <Controller
            name="base_currency"
            control={control}
            render={({ field }) => (
              <select
                id="currency"
                value={field.value}
                onChange={field.onChange}
                disabled={currenciesLoading}
                className={`${inputBase} appearance-none pr-10 ${
                  errors.base_currency ? "border-error" : "border-border"
                } disabled:opacity-60`}
              >
                {currenciesLoading ? (
                  <option value="">Loading currencies...</option>
                ) : (
                  currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {getCurrencyLabel(c.code, c.name)}
                    </option>
                  ))
                )}
              </select>
            )}
          />
          <ChevronDown
            className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 pointer-events-none text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        {errors.base_currency && (
          <p className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            {errors.base_currency.message}
          </p>
        )}
      </div>

      {/* Form Actions */}
      <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`${primaryTripActionButtonClassName} disabled:cursor-not-allowed`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {initial ? "Saving…" : "Creating…"}
            </>
          ) : (
            <>
              {initial ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
              {submitLabel ?? (initial ? "Save Changes" : "Create Trip")}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Cancel
        </button>
      </div>
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
    budget: initial.budget ? String(initial.budget) : "",
    notes: initial.notes ?? "",
  }
}
