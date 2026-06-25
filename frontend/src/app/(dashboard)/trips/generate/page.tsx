"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { APIProvider } from "@vis.gl/react-google-maps"
import { DraftPreview } from "@/features/trip/components/DraftPreview"
import { GenerateChatWizard } from "@/features/trip/components/GenerateChatWizard"
import { GeneratingItinerarySkeleton } from "@/features/trip/components/GeneratingItinerarySkeleton"
import {
  useCreateTripFromDraft,
  useGenerateTripDraft,
} from "@/features/trip/hooks/useTrips"
import { resolveDraftLocations } from "@/features/trip/lib/resolveDraftLocations"
import { resolveDestinationMeta } from "@/features/trip/lib/resolveDestinationMeta"
import type { GenerateTripInput, GenerateTripResponse } from "@/features/trip/types"
import { ApiError } from "@/lib/api"

const MAX_DAYS = 10
const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""

export default function GenerateTripPage() {
  const router = useRouter()

  const [result, setResult] = useState<GenerateTripResponse | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  // Number of days for the in-progress request, used to size the skeleton.
  const [pendingDays, setPendingDays] = useState(4)
  // Trip destination (from form input) — needed to bias Places resolution.
  const [destination, setDestination] = useState("")
  // True while we resolve location names → coordinates via Google Places,
  // just before persisting the trip.
  const [resolving, setResolving] = useState(false)

  const generate = useGenerateTripDraft()
  const create = useCreateTripFromDraft()

  const handleGenerate = async (input: GenerateTripInput) => {
    setFormError(null)
    // Save destination for later use during Places resolution.
    setDestination(input.destination)
    // Estimate trip length (inclusive) so the loading skeleton matches.
    const start = new Date(input.start_date)
    const end = new Date(input.end_date)
    const dayCount = Math.round(
      (end.getTime() - start.getTime()) / 86400000,
    ) + 1
    setPendingDays(
      Number.isFinite(dayCount) && dayCount > 0 ? Math.min(dayCount, MAX_DAYS) : 4,
    )
    try {
      const res = await generate.mutateAsync(input)
      setResult(res)
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Failed to generate itinerary. Please try again.",
      )
    }
  }

  const handleCreate = async () => {
    if (!result) return
    setFormError(null)
    try {
      // Resolve each location name → real coordinates via Google Places
      // (same source as the manual location autocomplete) so the saved trip
      // carries accurate lat/lng. Best-effort: if Maps isn't available the
      // original draft is used unchanged.
      setResolving(true)
      let draft = result.draft
      let coverImageUrl = ""
      let description = ""
      try {
        draft = await resolveDraftLocations(result.draft, destination)
        // Resolve destination → cover image + formatted address from Google Places.
        const meta = await resolveDestinationMeta(destination)
        if (meta) {
          coverImageUrl = meta.coverImageUrl
          description = meta.description
        }
      } catch {
        // Ignore resolution failures — fall back to the unresolved draft.
      } finally {
        setResolving(false)
      }

      const { trip_id } = await create.mutateAsync({
        start_date: result.start_date,
        end_date: result.end_date,
        draft,
        cover_image_url: coverImageUrl,
        description,
      })
      router.push(`/trips/${trip_id}/overview`)
    } catch (err) {
      setResolving(false)
      setFormError(
        err instanceof ApiError ? err.message : "Failed to save trip. Please try again.",
      )
    }
  }

  const saving = create.isPending || resolving

  // Warn before leaving during generation
  const busy = generate.isPending || saving
  useEffect(() => {
    if (!busy) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [busy])

  return (
    <APIProvider apiKey={MAPS_API_KEY} libraries={["places"]}>
    <div className="mx-auto max-w-3xl w-full px-margin-mobile md:px-margin-desktop pt-8 pb-24">
      <Link
        href="/trips"
        className="mb-6 inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-primary transition-colors"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
        Back to Trips
      </Link>

      <header className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 28 }}>
            auto_fix_high
          </span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            Generate Trip with AI
          </h1>
        </div>
        <p className="font-body-md text-on-surface-variant">
          Answer a few questions and let AI build your starter itinerary. Up to {MAX_DAYS} days.
        </p>
      </header>

      {generate.isPending ? (
        <div className="rounded-xl border border-surface-container-high bg-white shadow-sm p-6">
          <GeneratingItinerarySkeleton days={pendingDays} />
        </div>
      ) : !result ? (
        <>
          <GenerateChatWizard onSubmit={handleGenerate} disabled={generate.isPending} />
          {formError && <p className="mt-4 text-body-sm text-error">{formError}</p>}
        </>
      ) : (
        <div className="space-y-6">
          <DraftPreview draft={result.draft} />

          {formError && <p className="text-body-sm text-error">{formError}</p>}

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              className="w-full sm:w-auto px-8 py-3 bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:opacity-90 transition-all active:scale-95 shadow-md shadow-primary/20 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>
                    progress_activity
                  </span>
                  {resolving ? "Resolving locations…" : "Saving…"}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span>
                  Create Trip
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setResult(null)
                setFormError(null)
              }}
              disabled={saving}
              className="w-full sm:w-auto px-8 py-3 text-on-surface-variant font-label-md text-label-md text-center hover:text-primary transition-colors disabled:opacity-60"
            >
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
    </APIProvider>
  )
}
