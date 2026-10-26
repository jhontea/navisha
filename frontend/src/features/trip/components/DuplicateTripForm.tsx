"use client"

import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { FormActions } from "@/components/forms/FormActions"
import { FormField } from "@/components/forms/FormField"
import { FormFieldDescription } from "@/components/forms/FormFieldState"
import { SelectableRow } from "@/components/SelectableRow"
import { Input } from "@/components/ui/input"
import { addDaysISO, formatFriendlyRange, getInclusiveDayCount } from "../lib/dates"
import type { Trip } from "../types"

const schema = z.object({
  // Blank is fine: the server then uses "<title> (copy)".
  title: z.string().max(200, { message: "Title must be 200 characters or less" }),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Pick a start date" }),
  include_bookings: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export function DuplicateTripForm({
  trip,
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  trip: Pick<Trip, "title" | "start_date" | "end_date">
  isSubmitting: boolean
  onSubmit: (input: FormValues) => Promise<unknown>
  onCancel: () => void
}) {
  const days = getInclusiveDayCount(trip.start_date, trip.end_date) ?? 1
  const dayLabel = `${days} ${days === 1 ? "day" : "days"}`
  const defaultTitle = `${trip.title} (copy)`
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: defaultTitle, start_date: "", include_bookings: false },
  })
  // An untouched default goes out blank so the server builds it and trims a long title to fit.
  const submit = (values: FormValues) =>
    onSubmit({ ...values, title: values.title === defaultTitle ? "" : values.title })
  const startDate = useWatch({ control, name: "start_date" })
  const includeBookings = useWatch({ control, name: "include_bookings" })
  const endDate = startDate ? addDaysISO(startDate, days - 1) : ""

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-5" noValidate>
      <FormField label="Title" htmlFor="duplicate-title" error={errors.title?.message} errorId="duplicate-title-error">
        <Input
          id="duplicate-title"
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "duplicate-title-error" : undefined}
          {...register("title")}
        />
      </FormField>

      <FormField
        label="Start date"
        htmlFor="duplicate-start"
        required
        error={errors.start_date?.message}
        errorId="duplicate-start-error"
      >
        <Input
          id="duplicate-start"
          type="date"
          aria-invalid={!!errors.start_date}
          aria-describedby={errors.start_date ? "duplicate-range duplicate-start-error" : "duplicate-range"}
          {...register("start_date")}
          onClick={(e) => {
            try {
              e.currentTarget.showPicker?.()
            } catch {}
          }}
        />
        <FormFieldDescription id="duplicate-range" className="tabular-nums">
          {endDate ? `${formatFriendlyRange(startDate, endDate)} · ${dayLabel}` : `Same length as this trip: ${dayLabel}.`}
        </FormFieldDescription>
      </FormField>

      <SelectableRow
        selected={includeBookings}
        onToggle={() => setValue("include_bookings", !includeBookings)}
        disabled={isSubmitting}
      >
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-foreground">Include bookings</span>
          <span className="text-xs text-muted-foreground">
            Transport and stays move with the new dates. Booking numbers and costs are not copied.
          </span>
        </span>
      </SelectableRow>

      <p className="text-xs text-muted-foreground">
        Days, notes and activities are copied. To-dos start unchecked. Expenses stay with this trip.
      </p>

      <FormActions
        submitLabel="Duplicate trip"
        submittingLabel="Duplicating…"
        isSubmitting={isSubmitting}
        submitDisabled={!startDate}
        onCancel={onCancel}
      />
    </form>
  )
}
