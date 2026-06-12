"use client"

import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCreateTrip } from "../hooks/useTrips"

const SUPPORTED_CURRENCIES = ["IDR", "USD", "JPY", "SGD", "KRW"] as const

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const schema = z
  .object({
    title: z.string().min(1, { message: "Title is required" }).max(120),
    description: z.string().max(500).optional(),
    start_date: z
      .string()
      .min(1, { message: "Start date is required" })
      .regex(ISO_DATE, { message: "Use the date picker (YYYY-MM-DD)" }),
    end_date: z
      .string()
      .min(1, { message: "End date is required" })
      .regex(ISO_DATE, { message: "Use the date picker (YYYY-MM-DD)" }),
    base_currency: z.enum(SUPPORTED_CURRENCIES),
    cover_image_url: z
      .union([z.literal(""), z.url({ message: "Must be a valid URL" })])
      .optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((d) => new Date(d.end_date) >= new Date(d.start_date), {
    message: "End date must be on or after start date",
    path: ["end_date"],
  })

type FormValues = z.infer<typeof schema>

export function TripForm() {
  const router = useRouter()
  const { mutateAsync, isPending } = useCreateTrip()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      start_date: "",
      end_date: "",
      base_currency: "IDR",
      cover_image_url: "",
      notes: "",
    },
  })

  const onSubmit = async (values: FormValues) => {
    const trip = await mutateAsync({
      ...values,
      description: values.description ?? "",
      cover_image_url: values.cover_image_url ?? "",
      notes: values.notes ?? "",
    })
    router.push(`/trips/${trip.id}`)
  }

  // Open native date picker on click — avoids the user having to hit the calendar icon.
  // showPicker requires a user gesture; only call from onClick (not onFocus) and swallow
  // NotAllowedError if the browser is strict.
  const openPicker = (e: React.MouseEvent<HTMLInputElement>) => {
    try {
      e.currentTarget.showPicker?.()
    } catch {
      // ignore — falls back to default browser behaviour (calendar icon click)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Field label="Title" error={errors.title?.message}>
        <Input placeholder="Bali Trip" {...register("title")} />
      </Field>

      <Field label="Description" error={errors.description?.message}>
        <Textarea
          rows={2}
          placeholder="Short summary"
          {...register("description")}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date" error={errors.start_date?.message}>
          <Input
            type="date"
            onClick={openPicker}
            {...register("start_date")}
          />
        </Field>
        <Field label="End date" error={errors.end_date?.message}>
          <Input
            type="date"
            onClick={openPicker}
            {...register("end_date")}
          />
        </Field>
      </div>

      <Field label="Base currency" error={errors.base_currency?.message}>
        <Controller
          name="base_currency"
          control={control}
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

      <Field label="Cover image URL" error={errors.cover_image_url?.message}>
        <Input placeholder="https://…" {...register("cover_image_url")} />
      </Field>

      <Field label="Notes" error={errors.notes?.message}>
        <Textarea rows={3} {...register("notes")} />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create trip"}
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
