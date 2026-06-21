"use client"

import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { useSupportedCurrencies } from "@/features/currency/hooks/useCurrency"
import type { CreateTripInput, Trip } from "../types"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// Fallback names for when backend doesn't return name field yet
const CURRENCY_NAMES: Record<string, string> = {
  IDR: "Indonesian Rupiah",
  USD: "US Dollar",
  JPY: "Japanese Yen",
  SGD: "Singapore Dollar",
  KRW: "South Korean Won",
  EUR: "Euro",
  GBP: "British Pound",
  AUD: "Australian Dollar",
  MYR: "Malaysian Ringgit",
  THB: "Thai Baht",
  CNY: "Chinese Yuan",
}

function getCurrencyLabel(code: string, name?: string): string {
  const resolvedName = name || CURRENCY_NAMES[code] || code
  return `${code} - ${resolvedName}`
}

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

function MaterialIcon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span
      className={`material-symbols-outlined select-none ${className}`}
      style={{ fontSize: 20, lineHeight: 1, verticalAlign: "middle" }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}

const inputBase =
  "w-full px-4 py-3 rounded-lg border bg-surface-container-lowest font-body-md text-body-md text-on-surface transition-all focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-on-surface-variant/50"

export function TripForm({ initial, onSubmit, isSubmitting, submitLabel }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(
    initial?.cover_image_url ?? null
  )

  const { data: currencyData, isLoading: currenciesLoading } = useSupportedCurrencies()
  const currencies = currencyData?.supported ?? []

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaults(initial),
  })

  const submit = async (values: FormValues) => {
    await onSubmit({
      title: values.title,
      description: values.destination ?? "",
      start_date: values.start_date,
      end_date: values.end_date,
      base_currency: values.base_currency,
      cover_image_url: coverPreview && !coverPreview.startsWith("blob:") ? coverPreview : "",
      notes: values.notes ?? "",
    })
  }

  const openPicker = (e: React.MouseEvent<HTMLInputElement>) => {
    try {
      e.currentTarget.showPicker?.()
    } catch {
      // fallback to native calendar
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setCoverPreview(url)
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      {/* Trip Title */}
      <div className="space-y-2">
        <label className="font-label-md text-label-md text-on-surface" htmlFor="trip-title">
          Trip Title
        </label>
        <input
          id="trip-title"
          className={`${inputBase} ${errors.title ? "border-error" : "border-outline-variant"}`}
          placeholder="e.g., Summer in Tokyo"
          {...register("title")}
        />
        {errors.title && <p className="text-xs text-error">{errors.title.message}</p>}
      </div>

      {/* Destination */}
      <div className="space-y-2">
        <label className="font-label-md text-label-md text-on-surface" htmlFor="destination">
          Destination
        </label>
        <div className="flex items-center rounded-lg border bg-surface-container-lowest transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden"
          style={{ borderColor: errors.destination ? 'hsl(var(--error))' : undefined }}
        >
          {/* Icon area */}
          <div className="flex items-center justify-center px-4 shrink-0">
            <span
              className="material-symbols-outlined text-outline pointer-events-none"
              style={{ fontSize: 20 }}
              aria-hidden="true"
            >
              location_on
            </span>
          </div>
          {/* Divider */}
          <span className="h-6 w-px bg-outline-variant shrink-0" />
          {/* Input */}
          <input
            id="destination"
            className="flex-1 px-4 py-3 bg-transparent border-0 outline-none font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50"
            placeholder="Search city or country"
            {...register("destination")}
          />
        </div>
        {errors.destination && (
          <p className="text-xs text-error">{errors.destination.message}</p>
        )}
      </div>

      {/* Date Range — side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="space-y-2">
          <label className="font-label-md text-label-md text-on-surface" htmlFor="start-date">
            Start Date
          </label>
          <input
            id="start-date"
            type="date"
            className={`${inputBase} ${errors.start_date ? "border-error" : "border-outline-variant"}`}
            onClick={openPicker}
            {...register("start_date")}
          />
          {errors.start_date && (
            <p className="text-xs text-error">{errors.start_date.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="font-label-md text-label-md text-on-surface" htmlFor="end-date">
            End Date
          </label>
          <input
            id="end-date"
            type="date"
            className={`${inputBase} ${errors.end_date ? "border-error" : "border-outline-variant"}`}
            onClick={openPicker}
            {...register("end_date")}
          />
          {errors.end_date && (
            <p className="text-xs text-error">{errors.end_date.message}</p>
          )}
        </div>
      </div>

      {/* Base Currency — from backend */}
      <div className="space-y-2">
        <label className="font-label-md text-label-md text-on-surface" htmlFor="currency">
          Base Currency
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
                  errors.base_currency ? "border-error" : "border-outline-variant"
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
          <span
            className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-outline"
            style={{ fontSize: 20 }}
          >
            expand_more
          </span>
        </div>
        {errors.base_currency && (
          <p className="text-xs text-error">{errors.base_currency.message}</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto px-8 py-3 bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:opacity-90 transition-all active:scale-95 shadow-md shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span
                className="material-symbols-outlined animate-spin"
                style={{ fontSize: 18 }}
              >
                progress_activity
              </span>
              Creating...
            </>
          ) : (
            submitLabel ?? (initial ? "Save changes" : "Create Trip")
          )}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="w-full sm:w-auto px-8 py-3 text-on-surface-variant font-label-md text-label-md text-center hover:text-primary transition-colors disabled:opacity-60"
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
      notes: "",
    }
  }
  return {
    title: initial.title,
    destination: initial.description ?? "",
    start_date: initial.start_date,
    end_date: initial.end_date,
    base_currency: initial.base_currency ?? "IDR",
    notes: initial.notes ?? "",
  }
}
