"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { TripForm } from "@/features/trip/components/TripForm"
import { useCreateTrip } from "@/features/trip/hooks/useTrips"

export default function NewTripPage() {
  const router = useRouter()
  const { mutateAsync, isPending } = useCreateTrip()

  return (
    <div className="mx-auto max-w-max-width w-full px-margin-mobile md:px-margin-desktop pt-8 pb-24">
      {/* Form Card */}
      <div className="bg-white rounded-xl shadow-sm border border-surface-container-high p-8 space-y-8">
          {/* Card Header */}
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-primary transition-colors mb-4"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
              Back to Dashboard
            </Link>
            <h3 className="font-headline-md text-headline-md mb-1">Trip Details</h3>
            <p className="font-body-md text-on-surface-variant">
              Let&apos;s start planning your next great adventure.
            </p>
          </div>

          <TripForm
            isSubmitting={isPending}
            onSubmit={async (input) => {
              const trip = await mutateAsync(input)
              router.push(`/trips/${trip.id}/overview`)
            }}
          />
      </div>

      {/* Pro Tip */}
      <div className="mt-8 bg-primary-fixed text-on-primary-fixed p-6 rounded-xl space-y-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>lightbulb</span>
          <span className="font-label-md text-label-md">Pro Tip</span>
        </div>
        <p className="text-body-sm opacity-90 leading-relaxed">
          Organizing by destination helps Navisha suggest the best transport
          routes and local currency tips automatically.
        </p>
      </div>
    </div>
  )
}
