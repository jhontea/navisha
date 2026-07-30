"use client"

import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { useCreateTrip } from "@/features/trip/hooks/useTrips"
import { BackLink } from "@/components/BackLink"
import { Lightbulb, Luggage } from "lucide-react"

const TripForm = dynamic(
  () => import("@/features/trip/components/TripForm").then((module) => module.TripForm),
  {
    ssr: false,
    loading: () => <div className="h-96 animate-pulse rounded-xl bg-muted/30" aria-hidden="true" />,
  },
)

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
            <Luggage className="h-[22px] w-[22px] text-primary" aria-hidden="true" />
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
          <Lightbulb className="h-5 w-5 text-primary" aria-hidden="true" />
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
