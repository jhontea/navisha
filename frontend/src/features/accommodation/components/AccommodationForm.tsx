"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import type {
  Accommodation,
  CreateAccommodationInput,
} from "../types"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const schema = z
  .object({
    name: z.string().min(1, "Name is required").max(200),
    location_name: z.string().max(200).optional(),
    lat: z.string().optional(),
    lng: z.string().optional(),
    google_place_id: z.string().optional(),
    check_in: z
      .string()
      .min(1, "Check-in is required")
      .regex(ISO_DATE, "Use the date picker"),
    check_out: z
      .string()
      .min(1, "Check-out is required")
      .regex(ISO_DATE, "Use the date picker"),
    confirmation_number: z.string().max(200).optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((d) => new Date(d.check_out) >= new Date(d.check_in), {
    message: "Check-out must be on or after check-in",
    path: ["check_out"],
  })

type FormValues = z.infer<typeof schema>

interface Props {
  initial?: Accommodation
  onSubmit: (input: CreateAccommodationInput) => Promise<unknown>
  onCancel: () => void
  isSubmitting: boolean
}

export function AccommodationForm({
  initial,
  onSubmit,
  onCancel,
  isSubmitting,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      location_name: initial?.location_name ?? "",
      lat: initial?.lat != null ? String(initial.lat) : "",
      lng: initial?.lng != null ? String(initial.lng) : "",
      google_place_id: initial?.google_place_id ?? "",
      check_in: initial?.check_in ?? "",
      check_out: initial?.check_out ?? "",
      confirmation_number: initial?.confirmation_number ?? "",
      notes: initial?.notes ?? "",
    },
  })

  const submit = async (v: FormValues) => {
    await onSubmit({
      name: v.name,
      location_name: v.location_name,
      lat: v.lat ? Number(v.lat) : null,
      lng: v.lng ? Number(v.lng) : null,
      google_place_id: v.google_place_id,
      check_in: v.check_in,
      check_out: v.check_out,
      confirmation_number: v.confirmation_number,
      notes: v.notes,
    })
  }

  const openPicker = (e: React.MouseEvent<HTMLInputElement>) => {
    try {
      e.currentTarget.showPicker?.()
    } catch {
      // ignore
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      <Field label="Name" error={errors.name?.message}>
        <Input placeholder="Four Seasons Bali" {...register("name")} />
      </Field>

      <Field label="Location" error={errors.location_name?.message}>
        <Input placeholder="Jimbaran, Bali" {...register("location_name")} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Check-in" error={errors.check_in?.message}>
          <Input
            type="date"
            onClick={openPicker}
            {...register("check_in")}
          />
        </Field>
        <Field label="Check-out" error={errors.check_out?.message}>
          <Input
            type="date"
            onClick={openPicker}
            {...register("check_out")}
          />
        </Field>
      </div>

      <Field
        label="Confirmation number"
        error={errors.confirmation_number?.message}
      >
        <Input placeholder="FS-12345" {...register("confirmation_number")} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude (optional)">
          <Input placeholder="-8.7832" {...register("lat")} />
        </Field>
        <Field label="Longitude (optional)">
          <Input placeholder="115.1637" {...register("lng")} />
        </Field>
      </div>

      <Field label="Notes">
        <Textarea rows={2} {...register("notes")} />
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
          {isSubmitting ? "Saving…" : initial ? "Save" : "Add stay"}
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
