"use client"

import { useState } from "react"
import { ChevronDown, Hash, SlidersHorizontal, Ticket } from "lucide-react"
import { Controller, type UseFormReturn } from "react-hook-form"

import { FormFieldDescription, FormFieldError, FormFieldLabel } from "@/components/forms/FormFieldState"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { SUPPORTED_CURRENCIES } from "@/lib/currency"
import { cn } from "@/lib/utils"

import type { TransportFormValues } from "../../lib/transportFormValues"

const OPTIONAL_FIELDS = ["label", "operator", "reference_number", "amount", "notes"] as const

/**
 * Optional transport fields (label, operator, booking reference, cost, notes)
 * behind a disclosure, so they stay out of the main path. Opens by itself
 * when it holds a value on edit or one of its fields fails validation.
 */
export function TransportDetailsFields({
  form,
  withCost,
  editing,
}: {
  form: UseFormReturn<TransportFormValues>
  withCost?: boolean
  /** Editing a saved transport: the cost changes its existing expense. */
  editing?: boolean
}) {
  const {
    control,
    register,
    watch,
    getValues,
    formState: { errors },
  } = form
  const [open, setOpen] = useState(() => {
    const v = getValues()
    return Boolean(v.label || v.operator || v.reference_number || v.notes || v.amount)
  })
  const filledCount = watch([...OPTIONAL_FIELDS]).filter((value) => Boolean(value?.trim())).length

  const hasError = OPTIONAL_FIELDS.some((name) => errors[name]) || Boolean(errors.currency)
  const [prevHasError, setPrevHasError] = useState(false)
  if (hasError !== prevHasError) {
    setPrevHasError(hasError)
    if (hasError) setOpen(true)
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border/70 bg-muted/10">
      {/* eslint-disable-next-line no-restricted-syntax -- disclosure header for the optional details section */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls="transport-additional-details"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">Additional details</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">Label, operator, booking reference, cost, and notes</span>
        </span>
        {filledCount > 0 && (
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary-soft-foreground">{filledCount}</span>
        )}
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div id="transport-additional-details" className="space-y-5 border-t p-4">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <FormFieldLabel htmlFor="transport-label" optional>
                Transport label
              </FormFieldLabel>
              <div className="relative">
                <Ticket className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="transport-label"
                  className="pl-10"
                  placeholder="e.g. GA 420 or Airport shuttle"
                  aria-invalid={Boolean(errors.label)}
                  aria-describedby={errors.label ? "transport-label-error" : undefined}
                  {...register("label")}
                />
              </div>
              <FormFieldError id="transport-label-error">{errors.label?.message}</FormFieldError>
            </div>

            <div className="space-y-2">
              <FormFieldLabel htmlFor="transport-operator" optional>
                Operator
              </FormFieldLabel>
              <Input
                id="transport-operator"
                placeholder="e.g. Garuda Indonesia"
                aria-invalid={Boolean(errors.operator)}
                aria-describedby={errors.operator ? "transport-operator-error" : undefined}
                {...register("operator")}
              />
              <FormFieldError id="transport-operator-error">{errors.operator?.message}</FormFieldError>
            </div>

            <div className="space-y-2 md:col-span-2">
              <FormFieldLabel htmlFor="transport-reference" optional>
                Booking reference
              </FormFieldLabel>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="transport-reference"
                  className="pl-10"
                  placeholder="e.g. ABC123 or e-ticket number"
                  aria-invalid={Boolean(errors.reference_number)}
                  aria-describedby={errors.reference_number ? "transport-reference-error" : undefined}
                  {...register("reference_number")}
                />
              </div>
              <FormFieldError id="transport-reference-error">{errors.reference_number?.message}</FormFieldError>
            </div>
          </div>

          {withCost && (
            <div className="rounded-2xl bg-muted p-4">
              <FormFieldLabel optional className="text-sm">
                Cost
              </FormFieldLabel>
              <FormFieldDescription className="mt-1">
                {editing
                  ? "Kept as an expense in the trip budget. Clear the amount to remove it."
                  : "Adds an expense to the trip budget when an amount is entered."}
              </FormFieldDescription>
              <div className="mt-3 grid grid-cols-[1fr_6rem] gap-3">
                <Input type="number" inputMode="decimal" placeholder="0" aria-label="Cost amount" {...register("amount")} />
                <Controller
                  control={control}
                  name="currency"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger aria-label="Cost currency">
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

          <div className="space-y-2">
            <FormFieldLabel htmlFor="transport-notes" optional>
              Notes
            </FormFieldLabel>
            <Textarea
              id="transport-notes"
              rows={3}
              placeholder="Terminal, check-in instructions, or other details…"
              aria-invalid={Boolean(errors.notes)}
              aria-describedby={errors.notes ? "transport-notes-error" : undefined}
              {...register("notes")}
            />
            <FormFieldError id="transport-notes-error">{errors.notes?.message}</FormFieldError>
          </div>
        </div>
      )}
    </section>
  )
}
