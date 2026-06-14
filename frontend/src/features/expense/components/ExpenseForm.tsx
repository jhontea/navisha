"use client"

import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useConvert } from "@/features/currency/hooks/useCurrency"
import {
  EXPENSE_CATEGORIES,
  type CreateExpenseInput,
  type Expense,
  type ExpenseCategory,
} from "../types"

const SUPPORTED_CURRENCIES = ["IDR", "USD", "JPY", "SGD", "KRW"] as const

const schema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => Number(v) > 0, "Amount must be > 0"),
  currency: z.enum(SUPPORTED_CURRENCIES),
  category: z.enum(["accommodation", "transport", "food", "activity", "other"]),
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
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initial?.title ?? "",
      amount: initial ? String(initial.amount) : "",
      currency: (initial?.currency as FormValues["currency"]) ?? tripBaseCurrency as FormValues["currency"],
      category: initial?.category ?? "food",
    },
  })

  const amount = Number(watch("amount"))
  const currency = watch("currency")
  // Live preview only when the source ≠ trip base, otherwise no conversion needed.
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
    })
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      <Field label="Title" error={errors.title?.message}>
        <Input placeholder="Hotel deposit" {...register("title")} />
      </Field>

      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <Field label="Amount" error={errors.amount?.message}>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="0"
            {...register("amount")}
          />
        </Field>
        <Field label="Currency" error={errors.currency?.message}>
          <Controller
            control={control}
            name="currency"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
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
        </Field>
      </div>

      {previewEnabled && preview && (
        <p className="text-xs text-muted-foreground">
          ≈{" "}
          {preview.converted_amount.toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })}{" "}
          {tripBaseCurrency} at 1 {currency} ={" "}
          {preview.rate.toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
          {tripBaseCurrency}
        </p>
      )}

      <Field label="Category" error={errors.category?.message}>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : initial ? "Save" : "Add expense"}
        </Button>
      </div>
    </form>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
