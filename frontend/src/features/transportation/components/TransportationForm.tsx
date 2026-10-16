"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Boxes, Bus, Car, Plane, Ship, Train, TramFront } from "lucide-react"
import { Controller, useForm } from "react-hook-form"

import { Chip } from "@/components/Chip"
import { FormActions } from "@/components/forms/FormActions"
import { FormFieldError, FormFieldLabel } from "@/components/forms/FormFieldState"
import { LocationAutocomplete } from "@/features/activity/components/LocationAutocomplete"
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@/lib/currency"
import type { LinkedCost } from "@/lib/linkedCost"
import { cn } from "@/lib/utils"

import {
  transportFormDefaults,
  transportFormSchema,
  transportInput,
  type TransportFormValues,
} from "../lib/transportFormValues"
import {
  TRANSPORTATION_TYPES,
  type CreateTransportationInput,
  type Transportation,
  type TransportationType,
} from "../types"
import { TransportDetailsFields } from "./form/TransportDetailsFields"
import { TransportationScheduleFields } from "./TransportationScheduleFields"

const TYPE_META: Record<TransportationType, { label: string; Icon: typeof Plane }> = {
  flight: { label: "Flight", Icon: Plane },
  bus: { label: "Bus", Icon: Bus },
  train: { label: "Train", Icon: Train },
  ferry: { label: "Ferry", Icon: TramFront },
  ship: { label: "Ship", Icon: Ship },
  car: { label: "Car", Icon: Car },
  other: { label: "Other", Icon: Boxes },
}

const validate = { shouldDirty: true, shouldValidate: true } as const

interface Props {
  initial?: Transportation
  /** When true, the type selector is shown as a read-only chip (no changing type on edit). */
  lockType?: boolean
  tripBaseCurrency?: string
  withCost?: boolean
  /** On edit: the cost already linked to this transport, to prefill. */
  initialCost?: LinkedCost | null
  onSubmit: (input: CreateTransportationInput) => Promise<unknown>
  onCancel: () => void
  isSubmitting: boolean
}

export function TransportationForm({
  initial,
  lockType,
  tripBaseCurrency,
  withCost,
  initialCost,
  onSubmit,
  onCancel,
  isSubmitting,
}: Props) {
  const currency: CurrencyCode = SUPPORTED_CURRENCIES.includes(tripBaseCurrency as CurrencyCode)
    ? (tripBaseCurrency as CurrencyCode)
    : "IDR"
  const form = useForm<TransportFormValues>({
    resolver: zodResolver(transportFormSchema),
    defaultValues: transportFormDefaults(initial, currency, initialCost),
  })
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = form

  return (
    <form
      onSubmit={handleSubmit((v) => onSubmit(transportInput(v, !withCost ? "off" : initial ? "edit" : "add")))}
      className="space-y-6"
      aria-busy={isSubmitting}
    >
      <fieldset disabled={isSubmitting} className="space-y-6">
        <div>
          <FormFieldLabel id="transport-type-label" required className="mb-3 block">
            Transport type
          </FormFieldLabel>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-labelledby="transport-type-label"
                aria-describedby={errors.type ? "transport-type-error" : undefined}
              >
                {TRANSPORTATION_TYPES.filter((t) => (lockType ? t === field.value : true)).map((t) => (
                  <Chip
                    key={t}
                    variant="option"
                    pressed={field.value === t}
                    icon={TYPE_META[t].Icon}
                    onClick={() => !lockType && field.onChange(t)}
                    disabled={lockType}
                    className={cn(lockType && "disabled:opacity-100")}
                  >
                    {TYPE_META[t].label}
                  </Chip>
                ))}
              </div>
            )}
          />
          <FormFieldError id="transport-type-error" className="mt-1">
            {errors.type?.message}
          </FormFieldError>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            {(["from", "to"] as const).map((end) => {
              const name = end === "from" ? "from_location" : "to_location"
              const error = errors[name]
              return (
                <div key={end} className="space-y-2">
                  <FormFieldLabel htmlFor={`transport-${end}`} required>
                    {end === "from" ? "From" : "To"}
                  </FormFieldLabel>
                  <Controller
                    control={control}
                    name={name}
                    render={({ field }) => (
                      <LocationAutocomplete
                        id={`transport-${end}`}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        disabled={isSubmitting}
                        ariaInvalid={Boolean(error)}
                        ariaRequired
                        ariaDescribedBy={error ? `transport-${end}-error` : undefined}
                        placeholder={end === "from" ? "e.g. Jakarta Airport" : "e.g. Bali Airport"}
                        onPlaceSelect={(p) => field.onChange(p.location_name || p.address)}
                      />
                    )}
                  />
                  <FormFieldError id={`transport-${end}-error`}>{error?.message}</FormFieldError>
                </div>
              )
            })}
          </div>

          <input type="hidden" {...register("departure_datetime")} />
          <input type="hidden" {...register("arrival_datetime")} />
          <TransportationScheduleFields
            departure={watch("departure_datetime")}
            arrival={watch("arrival_datetime") ?? ""}
            disabled={isSubmitting}
            departureError={errors.departure_datetime?.message}
            arrivalError={errors.arrival_datetime?.message}
            onDepartureChange={(value) => setValue("departure_datetime", value, validate)}
            onArrivalChange={(value) => setValue("arrival_datetime", value, validate)}
          />
        </div>

        <TransportDetailsFields form={form} withCost={withCost} editing={Boolean(initial)} />

        <FormActions onCancel={onCancel} isSubmitting={isSubmitting} submitLabel={initial ? "Save changes" : "Save transport"} />
      </fieldset>
    </form>
  )
}
