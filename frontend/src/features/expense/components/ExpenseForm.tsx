"use client"

import React, { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { cn } from "@/lib/utils"
import {
  FormFieldError,
  FormFieldLabel,
} from "@/components/forms/FormFieldState"
import { useConvert } from "@/features/currency/hooks/useCurrency"
import {
  EXPENSE_CATEGORIES,
  type CreateExpenseInput,
  type Expense,
  type ExpenseCategory,
} from "../types"
import { getCategoryColor } from "../categoryColors"

// Returns today's date as YYYY-MM-DD in the user's local timezone.
function localDateString(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const SUPPORTED_CURRENCIES = ["IDR", "USD", "JPY", "SGD", "KRW", "MYR", "THB", "EUR", "VND"] as const

const CATEGORY_OPTIONS = [
  { value: "food"          as ExpenseCategory, label: "Food & Dining",  placeholder: "e.g., Lunch at Ichiran" },
  { value: "transport"     as ExpenseCategory, label: "Transport",      placeholder: "e.g., Suica Top-up" },
  { value: "accommodation" as ExpenseCategory, label: "Stay",           placeholder: "e.g., Park Hyatt Night 1" },
  { value: "activity"      as ExpenseCategory, label: "Activity",       placeholder: "e.g., TeamLab Tickets" },
  { value: "souvenir"      as ExpenseCategory, label: "Gift",           placeholder: "e.g., Tokyo snacks" },
  { value: "shopping"      as ExpenseCategory, label: "Shopping",       placeholder: "e.g., Uniqlo haul" },
  { value: "other"         as ExpenseCategory, label: "Other",          placeholder: "e.g., Entry fee" },
].map(o => ({ ...o, ...getCategoryColor(o.value) }))

const schema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => Number(v) > 0, "Amount must be > 0"),
  currency: z.enum(SUPPORTED_CURRENCIES),
  category: z.enum(["accommodation", "transport", "food", "activity", "souvenir", "shopping", "other"]),
  expense_date: z.string().optional(),
  note: z.string().max(500).optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  initial?: Expense
  tripBaseCurrency: string
  onSubmit: (input: CreateExpenseInput) => Promise<unknown>
  onCancel: () => void
  isSubmitting: boolean
}

export function ExpenseForm({
  initial,
  tripBaseCurrency,
  onSubmit,
  onCancel,
  isSubmitting,
}: Props) {
  const { register, handleSubmit, control, watch, setValue, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        title: initial?.title ?? "",
        amount: initial ? String(initial.amount) : "",
        currency: (initial?.currency as FormValues["currency"]) ??
          (SUPPORTED_CURRENCIES.includes(tripBaseCurrency as FormValues["currency"])
            ? (tripBaseCurrency as FormValues["currency"])
            : "IDR"),
        category: initial?.category ?? "food",
        expense_date: initial?.expense_date ?? localDateString(),
        note: initial?.note ?? "",
      },
    })

  const [displayAmount, setDisplayAmount] = useState(
    initial ? Number(initial.amount).toLocaleString() : ""
  )

  const rawAmount = watch("amount")
  const amount = Number(rawAmount)
  const currency = watch("currency")
  const selectedCategory = watch("category")
  const previewEnabled = currency !== tripBaseCurrency && amount > 0
  const { data: preview } = useConvert(
    currency,
    tripBaseCurrency,
    previewEnabled ? amount : 0,
  )

  const submit = async (v: FormValues) => {
    await onSubmit({
      title: v.title,
      amount: Number(v.amount),
      currency: v.currency,
      category: v.category as ExpenseCategory,
      expense_date: v.expense_date || undefined,
      note: v.note || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-5" aria-busy={isSubmitting}>
      <fieldset disabled={isSubmitting} className="contents">
      {/* Category icon picker */}
      <div className="flex flex-col gap-2">
        <FormFieldLabel required>Category</FormFieldLabel>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {EXPENSE_CATEGORIES.map((cat) => {
                const opt = CATEGORY_OPTIONS.find((o) => o.value === cat)!
                const isSelected = field.value === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => field.onChange(cat)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all",
                      "font-label-md text-sm",
                      isSelected
                        ? cn("border-primary", opt.bg, opt.text)
                        : "border-border bg-background text-muted-foreground hover:border-primary/40",
                    )}
                    >
                    <opt.Icon
                      className={cn("h-4 w-4", isSelected ? opt.text : "text-muted-foreground")}
                      aria-hidden="true"
                    />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          )}
        />
        <FormFieldError>{errors.category?.message}</FormFieldError>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <FormFieldLabel htmlFor="expense-title" required>Expense Title</FormFieldLabel>
        <div className="relative flex items-center">
          {selectedCategory && (() => {
            const catOpt = CATEGORY_OPTIONS.find((o) => o.value === selectedCategory)
            if (!catOpt) return null
            return (
              <catOpt.Icon
                className={cn("absolute left-3.5 h-4 w-4 pointer-events-none", catOpt.text)}
                aria-hidden="true"
              />
            )
          })()}
          <input
            id="expense-title"
            {...register("title")}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "expense-title-error" : undefined}
            placeholder={CATEGORY_OPTIONS.find((o) => o.value === selectedCategory)?.placeholder ?? "e.g., Entry fee"}
            className={cn(
              "w-full py-2.5 rounded-lg border bg-background text-foreground",
              "focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all",
              "font-body-md placeholder:text-muted-foreground/60",
              selectedCategory ? "pl-10 pr-4" : "px-4",
              errors.title ? "border-destructive" : "border-border",
            )}
          />
        </div>
        <FormFieldError id="expense-title-error">{errors.title?.message}</FormFieldError>
      </div>

      {/* Amount + Currency + Date row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Amount + Currency */}
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1.5">
              <FormFieldLabel htmlFor="expense-amount" required>Amount</FormFieldLabel>
              <input {...register("amount")} type="hidden" />
              <input
                id="expense-amount"
                type="text"
                inputMode="numeric"
                aria-invalid={Boolean(errors.amount)}
                aria-describedby={errors.amount ? "expense-amount-error" : undefined}
                value={displayAmount}
                placeholder="0"
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.]/g, "")
                  const parts = raw.split(".")
                  const normalised = parts.length > 1 ? parts[0] + "." + parts.slice(1).join("") : raw
                  const num = parseFloat(normalised)
                  const [intPart, decPart] = normalised.split(".")
                  const formatted = intPart
                    ? Number(intPart).toLocaleString() + (decPart !== undefined ? "." + decPart : "")
                    : ""
                  setDisplayAmount(formatted)
                  setValue("amount", isNaN(num) ? "" : String(num), { shouldValidate: true })
                }}
                className={cn(
                  "w-full px-4 py-2.5 rounded-lg border bg-background text-foreground",
                  "focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all",
                  "font-body-md placeholder:text-muted-foreground/60",
                  errors.amount ? "border-destructive" : "border-border",
                )}
              />
              <FormFieldError id="expense-amount-error">{errors.amount?.message}</FormFieldError>
            </div>
            <div className="w-24 flex flex-col gap-1.5">
              <FormFieldLabel htmlFor="expense-currency" required>Currency</FormFieldLabel>
              <Controller
                control={control}
                name="currency"
                render={({ field }) => (
                  <select
                    id="expense-currency"
                    {...field}
                    className={cn(
                      "w-full px-3 py-2.5 rounded-lg border bg-background text-foreground",
                      "focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none",
                      "font-body-md",
                    )}
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}
              />
            </div>
          </div>
          {previewEnabled && preview && (
            <p className="text-label-sm text-primary font-medium flex items-center gap-1 mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
              ≈ {preview.converted_amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
              {tripBaseCurrency}{" "}
              <span className="text-muted-foreground font-normal">
                (1 {currency} = {preview.rate.toLocaleString(undefined, { maximumFractionDigits: 4 })} {tripBaseCurrency})
              </span>
            </p>
          )}
        </div>

        {/* Date */}
        <div className="flex flex-col gap-1.5">
          <FormFieldLabel htmlFor="expense-date" optional>Date</FormFieldLabel>
          <input
            id="expense-date"
            {...register("expense_date")}
            type="date"
            className={cn(
              "w-full px-4 py-2.5 rounded-lg border bg-background text-foreground",
              "focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all",
              "font-body-md",
              "border-border",
            )}
            onClick={(e) => { try { (e.currentTarget as HTMLInputElement).showPicker?.() } catch {} }}
          />
        </div>
      </div>

      {/* Note (optional) */}
      <div className="flex flex-col gap-1.5">
        <FormFieldLabel htmlFor="expense-note" optional>Note</FormFieldLabel>
        <textarea
          id="expense-note"
          {...register("note")}
          rows={2}
          placeholder="e.g., Split with 3 friends, or referral code used"
          className={cn(
            "w-full px-4 py-2.5 rounded-lg border bg-background text-foreground resize-none",
            "focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all",
            "font-body-md placeholder:text-muted-foreground/60 text-sm",
            "border-border",
          )}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-5 py-2.5 rounded-xl border border-border text-foreground font-label-md hover:bg-muted transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "px-5 py-2.5 rounded-xl bg-gradient-to-r from-chromatic-sunset via-chromatic-aurora to-chromatic-sky text-white font-label-md",
            "shadow-md shadow-chromatic-sunset/20 hover:shadow-lg hover:shadow-chromatic-sunset/30 transition-all active:scale-[0.98]",
            "disabled:opacity-60",
          )}
        >
          {isSubmitting ? "Saving…" : initial ? "Save changes" : "Add Expense"}
        </button>
      </div>
      </fieldset>
    </form>
  )
}
