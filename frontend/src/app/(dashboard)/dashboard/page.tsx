"use client"

import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/hooks"
import { TripList } from "@/features/trip/components/TripList"
import { StatsSection } from "@/features/trip/components/StatsSection"

export default function DashboardPage() {
  const { user } = useAuth()
  const firstName = user?.name?.split(" ")[0] ?? "traveler"

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-24 pt-8 md:px-10">
      <header className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="font-heading text-headline-lg-mobile md:text-headline-lg">
            Welcome back, {firstName}
          </h1>
          <p className="text-body-lg text-muted-foreground">
            Where are we exploring next?
          </p>
        </div>
        <Link href="/trips/new">
          <Button
            size="lg"
            className="gap-2 rounded-xl px-6 py-3 text-label-md shadow-lg shadow-primary/20 active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" />
            New trip
          </Button>
        </Link>
      </header>

      <TripList />
      <StatsSection />
    </div>
  )
}
