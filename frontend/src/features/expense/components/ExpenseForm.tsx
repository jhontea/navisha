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
  { value: "accommodation", label: "Stay", icon: "hotel", bg: "bg-stay-purple", text: "text-[#7C3AED]", placeholder: "e.g., Park Hyatt Night 1" },
  { value: "activity", label: "Activity", icon: "local_activity", bg: "bg-[#FFEDD5]", text: "text-orange-700", placeholder: "e.g., TeamLab Tickets" },
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
  compact?: boolean
}

export function ExpenseForm({
  initial,
  tripBaseCurrency,
  onSubmit,
  onCancel,
  isSubmitting,
  compact = false,
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
                    <span
                      className={cn(
                        "material-symbols-outlined text-[18px]",
                        isSelected ? opt.text : "text-muted-foreground",
                      )}
                    >
                      {opt.icon}
                    </span>
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
          {selectedCategory && (
            <span
              className={cn(
                "absolute left-3.5 material-symbols-outlined text-[18px] pointer-events-none",
                CATEGORY_OPTIONS.find((o) => o.value === selectedCategory)?.text ?? "text-muted-foreground",
              )}
            >
              {CATEGORY_OPTIONS.find((o) => o.value === selectedCategory)?.icon}
            </span>
          )}
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
              <span className="material-symbols-outlined text-[14px] align-middle">sync</span>
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
            "px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-label-md",
            "shadow-md shadow-primary/20 hover:opacity-90 transition-all active:scale-[0.98]",
            "disabled:opacity-60",
          )}
        >
          {isSubmitting ? "Saving…" : initial ? "Save changes" : "Add Expense"}
        </button>
      </div>
    </form>
  )
}
