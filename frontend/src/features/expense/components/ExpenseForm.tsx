"use client"

import React, { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { useConvert } from "@/features/currency/hooks/useCurrency"
import {
  EXPENSE_CATEGORIES,
  type CreateExpenseInput,
  type Expense,
  type ExpenseCategory,
} from "../types"

// Returns today's date as YYYY-MM-DD in the user's local timezone.
function localDateString(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const SUPPORTED_CURRENCIES = ["IDR", "USD", "JPY", "SGD", "KRW", "MYR", "THB", "EUR", "VND"] as const

const CATEGORY_OPTIONS: {
  value: ExpenseCategory
  label: string
  icon: string
  bg: string
  text: string
  placeholder: string
}[] = [
  { value: "food", label: "Food & Dining", icon: "restaurant", bg: "bg-[#DCFCE7]", text: "text-emerald-700", placeholder: "e.g., Lunch at Ichiran" },
  { value: "transport", label: "Transport", icon: "directions_subway", bg: "bg-[#DBEAFE]", text: "text-primary", placeholder: "e.g., Suica Top-up" },
  { value: "accommodation", label: "Stay", icon: "hotel", bg: "bg-violet-500/10", text: "text-violet-700 dark:text-violet-300", placeholder: "e.g., Park Hyatt Night 1" },
  { value: "activity", label: "Activity", icon: "local_activity", bg: "bg-[#E0E7FF]", text: "text-indigo-600", placeholder: "e.g., TeamLab Tickets" },
  { value: "souvenir", label: "Gift", icon: "redeem", bg: "bg-[#FCE7F3]", text: "text-pink-600", placeholder: "e.g., Tokyo snacks" },
  { value: "shopping", label: "Shopping", icon: "shopping_cart", bg: "bg-[#FEF9C3]", text: "text-yellow-700", placeholder: "e.g., Uniqlo haul" },
  { value: "other", label: "Other", icon: "receipt", bg: "bg-muted", text: "text-muted-foreground", placeholder: "e.g., Entry fee" },
]

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
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-5">
      {/* Category icon picker */}
      <div className="flex flex-col gap-2">
        <label className="font-label-md text-muted-foreground">Category</label>
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
                    onClick={() => field.onChange(cat)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all",
                      "font-label-md text-sm",
                      isSelected
                        ? cn("border-primary", opt.bg, opt.text)
                        : "border-border bg-background text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn(isSelected ? opt.text : "text-muted-foreground")} aria-hidden="true">
                      {opt.value === "food" && <><path d="M3 11l19-9-9 19-2-8-8-2z"/></>}
                      {opt.value === "transport" && <><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>}
                      {opt.value === "accommodation" && <><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/></>}
                      {opt.value === "activity" && <><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 4v16"/></>}
                      {opt.value === "souvenir" && <><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></>}
                      {opt.value === "shopping" && <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></>}
                      {opt.value === "other" && <><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>}
                    </svg>
                    {opt.label}
                  </button>
                )
              })}
            </div>
          )}
        />
        {errors.category && (
          <p className="text-xs text-destructive">{errors.category.message}</p>
        )}
      </div>

      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <label className="font-label-md text-muted-foreground">Expense Title</label>
        <div className="relative flex items-center">
          {selectedCategory && (() => {
            const catOpt = CATEGORY_OPTIONS.find((o) => o.value === selectedCategory)
            return (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("absolute left-3.5 pointer-events-none", catOpt?.text ?? "text-muted-foreground")} aria-hidden="true">
                {selectedCategory === "food" && <><path d="M3 11l19-9-9 19-2-8-8-2z"/></>}
                {selectedCategory === "transport" && <><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>}
                {selectedCategory === "accommodation" && <><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/></>}
                {selectedCategory === "activity" && <><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 4v16"/></>}
                {selectedCategory === "souvenir" && <><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></>}
                {selectedCategory === "shopping" && <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></>}
                {selectedCategory === "other" && <><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>}
              </svg>
            )
          })()}
          <input
            {...register("title")}
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
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Amount + Currency + Date row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Amount + Currency */}
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="font-label-md text-muted-foreground">Amount</label>
              <input {...register("amount")} type="hidden" />
              <input
                type="text"
                inputMode="numeric"
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
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>
            <div className="w-24 flex flex-col gap-1.5">
              <label className="font-label-md text-muted-foreground">Currency</label>
              <Controller
                control={control}
                name="currency"
                render={({ field }) => (
                  <select
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
          <label className="font-label-md text-muted-foreground">Date</label>
          <input
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
        <label className="font-label-md text-muted-foreground">
          Note{" "}
          <span className="font-normal text-xs text-muted-foreground/70">(optional)</span>
        </label>
        <textarea
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
          className="px-5 py-2.5 rounded-lg border border-border text-foreground font-label-md hover:bg-muted transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "px-5 py-2.5 rounded-lg bg-gradient-to-r from-chromatic-sunset via-chromatic-aurora to-chromatic-sky text-white font-label-md",
            "shadow-md shadow-chromatic-sunset/20 hover:shadow-lg hover:shadow-chromatic-sunset/30 transition-all active:scale-[0.98]",
            "disabled:opacity-60",
          )}
        >
          {isSubmitting ? "Saving…" : initial ? "Save changes" : "Add Expense"}
        </button>
      </div>
    </form>
  )
}
