"use client"

import { useRouter } from "next/navigation"
import { TripForm } from "@/features/trip/components/TripForm"
import { useCreateTrip } from "@/features/trip/hooks/useTrips"
import { BackLink } from "@/components/BackLink"

export default function NewTripPage() {
  const router = useRouter()
  const { mutateAsync, isPending } = useCreateTrip()

  return (
    <div className="mx-auto max-w-2xl w-full px-margin-mobile md:px-margin-desktop pt-8 pb-28">
      {/* Page header */}
      <BackLink href="/dashboard" className="mb-6" />

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
            <span
              className="material-symbols-outlined text-primary text-[22px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              luggage
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">New Trip</h1>
        </div>
        <p className="text-sm text-muted-foreground pl-[52px]">
          Let&apos;s start planning your next great adventure.
        </p>
      </div>

      {/* Form Card */}
      <div className="glass rounded-2xl p-6 md:p-8 space-y-6 animate-fade-in-up">
        <TripForm
          isSubmitting={isPending}
          onSubmit={async (input) => {
            const trip = await mutateAsync(input)
            router.push(`/trips/${trip.id}/overview`)
          }}
        />
      </div>

      {/* Pro Tip */}
      <div className="mt-6 flex gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 animate-fade-in-up">
        <div className="shrink-0 mt-0.5">
          <span
            className="material-symbols-outlined text-primary text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            lightbulb
          </span>
        </div>
        <div>
          <p className="text-xs font-semibold text-primary mb-1">Pro Tip</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Organizing by destination helps Navisha suggest the best transport routes and local
            currency tips automatically.
          </p>
        </div>
      </div>
    </div>
  )
}
