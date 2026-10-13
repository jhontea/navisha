"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Link2 } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { sharedTripUrl } from "../../lib/sharedTrip"
import type { PublicItinerary } from "../../types"
import { SharedTripView } from "./SharedTripView"

/** Public, read-only view of a trip opened from a share link (loads on the client). */
export function SharedTripPage({ token }: { token: string }) {
  const [trip, setTrip] = useState<PublicItinerary | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "expired" | "missing">("loading")

  useEffect(() => {
    if (!token) return
    fetch(sharedTripUrl(token), {
      cache: "no-store",
      referrerPolicy: "no-referrer",
    })
      .then(async (response) => {
        if (response.status === 410) return setStatus("expired")
        if (!response.ok) return setStatus("missing")
        setTrip(await response.json())
        setStatus("ready")
      })
      .catch(() => setStatus("missing"))
  }, [token])

  if (status === "loading") {
    return (
      <main className="mx-auto max-w-max-width px-margin-mobile pt-16 md:px-margin-desktop" aria-label="Loading trip" aria-busy="true">
        <div className="h-56 animate-pulse rounded-xl bg-muted" />
        <div className="mt-6 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </main>
    )
  }

  if (status !== "ready" || !trip) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Link2 className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </span>
          <h1 className="text-xl font-semibold text-foreground">
            {status === "expired" ? "This link has expired" : "This trip isn't available"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Ask the trip owner to send you a new share link.</p>
          <Link href="/" className={buttonVariants({ variant: "outline", className: "mt-5" })}>
            Go to Navisha
          </Link>
        </div>
      </main>
    )
  }

  return <SharedTripView trip={trip} />
}
