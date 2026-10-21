"use client"
// ══════════════════════════════════════════════════════════════════════════════
// AI Generate Trip Page — Critical Patterns (DO NOT REGRESS)
// ══════════════════════════════════════════════════════════════════════════════
//
// 1. Generation is a background job (useGenerateJob): start returns at once and
//    the hook polls until done. The user may leave and come back; the hook
//    resumes the latest job. NEVER await a long request in a click handler.
//
// 2. Double guard: submittedRef + result !== null
//    Prevents concurrent calls AND re-generation after success.
//
// 3. Overlay, don't unmount: skeleton overlays on top of wizard instead of
//    conditionally unmounting the wizard. Prevents state loss + callback churn.
//
// 4. useCallback on handleGenerate + handleCreate: stable references prevent
//    unnecessary child re-renders and callback identity changes.
//
// See: /memories/navisha-frontend-patterns.md

import { Suspense, useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LocationProviderBoundary } from "@/features/location/components/LocationProviderBoundary"
import { DraftPreview } from "@/features/trip/components/DraftPreview"
import { cn } from "@/lib/utils"
import { GenerateChatWizard } from "@/features/trip/components/GenerateChatWizard"
import { GeneratingItinerarySkeleton } from "@/features/trip/components/GeneratingItinerarySkeleton"
import { useCreateTripFromDraft, useAutogenQuota } from "@/features/trip/hooks/useTrips"
import { useGenerateJob } from "@/features/trip/hooks/useGenerateJob"
import { jobToResponse, loadSnapshot, snapshotFromInput } from "@/features/trip/lib/generateJob"
import { resolveDraftLocations } from "@/features/trip/lib/resolveDraftLocations"
import { flagFarFromVenue, type VenueAnchor } from "@/features/trip/lib/venueRadius"
import { resolveDestinationMeta } from "@/features/trip/lib/resolveDestinationMeta"
import { getDefaultTripCover } from "@/features/trip/lib/cover"
import { curateDraft } from "@/features/trip/lib/draftBookings"
import { AlertCircle, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { GenerateTripInput, GenerateTripResponse } from "@/features/trip/types"
import { ApiError } from "@/lib/api"
import { QuotaBadge } from "@/components/QuotaBadge"

const MAX_DAYS = 10
export function GenerateTripScreen() {
  return (
    <Suspense fallback={<GenerateTripPageFallback />}>
      <GenerateTripPageContent />
    </Suspense>
  )
}

function GenerateTripPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialValues = useMemo<Partial<GenerateTripInput>>(() => ({
    destination: searchParams.get("destination")?.slice(0, 60) ?? "",
    start_date: searchParams.get("start_date") ?? "",
    end_date: searchParams.get("end_date") ?? "",
    base_currency: searchParams.get("base_currency") ?? "IDR",
  }), [searchParams])

  const [formError, setFormError] = useState<string | null>(null)
  const [typedDestination, setTypedDestination] = useState("")
  // The event venue, when picked with coordinates: places pinned far from it
  // while the trip stays there are flagged for review.
  const [typedVenue, setTypedVenue] = useState<VenueAnchor | null>(null)
  const [resolving, setResolving] = useState(false)
  // Curation: which AI-suggested places the user wants to keep. Lifted here so
  // handleCreate can filter the draft before resolving/creating. Default empty
  // until DraftPreview reports its initial all-selected state.
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())

  const generate = useGenerateJob()
  const create = useCreateTripFromDraft()
  const quota = useAutogenQuota()

  // Prevent concurrent generate calls AND re-generation after success.
  const submittedRef = useRef(false) // one-shot: true once mutate fires, never reset

  // Stable refs so useCallback doesn't depend on hook objects.
  const startRef = useRef(generate.start)
  const quotaRef = useRef(quota)
  useEffect(() => { startRef.current = generate.start }, [generate.start])
  useEffect(() => { quotaRef.current = quota }, [quota])

  // Key to force fresh wizard mount when user retries after error.
  const [generationKey, setGenerationKey] = useState(0)

  // Reset the received flag when user starts a fresh generation.
  const dismissJob = generate.dismiss
  const resetGeneration = useCallback(() => {
    dismissJob()
    submittedRef.current = false
    setFormError(null)
    setSelectedKeys(new Set())
    setGenerationKey((k) => k + 1)
  }, [dismissJob])

  // A finished job (also one resumed after leaving the page) is the draft to review.
  const { job } = generate
  const result: GenerateTripResponse | null = useMemo(() => jobToResponse(job), [job])
  // After coming back, the wizard input is gone; the job's snapshot has what the
  // create step needs (destination for geocoding, event venue for the radius flag).
  const jobId = job?.job_id
  const snapshot = useMemo(() => (jobId ? loadSnapshot(jobId) : null), [jobId])
  const destination = snapshot?.destination ?? typedDestination
  const venue = snapshot ? snapshot.venue : typedVenue
  const jobStatus = job?.status
  useEffect(() => {
    if (jobStatus === "done") quotaRef.current.refetch()
  }, [jobStatus])

  const resultRef = useRef(result)
  useEffect(() => { resultRef.current = result }, [result])

  const handleGenerate = useCallback((input: GenerateTripInput) => {
    // Triple guard — prevents any possibility of double-submit
    if (submittedRef.current) return
    if (resultRef.current !== null) return

    submittedRef.current = true
    setFormError(null)
    const snap = snapshotFromInput(input)
    setTypedDestination(snap.destination)
    setTypedVenue(snap.venue)
    startRef.current(input)
  }, []) // stable — no deps that change on re-render

  const handleCreate = useCallback(async () => {
    if (!result) return
    setFormError(null)
    try {
      setResolving(true)
      // Filter the AI draft to only the user's selected places before
      // resolving/creating. Days are preserved (contiguity required) but
      // may end up empty if the user deselected everything in a day.
      const curatedDraft = curateDraft(result.draft, selectedKeys)
      // The AI's destination is already a clean place name ("Makkah & Madinah,
      // Saudi Arabia"); the wizard text ("Umroh") can geocode to a street.
      const tripDestination = result.draft.destination?.trim() || destination
      let draft = curatedDraft
      let description = tripDestination
      try {
        draft = flagFarFromVenue(await resolveDraftLocations(curatedDraft, tripDestination), venue)
        if (!result.draft.destination?.trim()) {
          const meta = await resolveDestinationMeta(destination)
          if (meta) description = meta.description
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
        cover_image_url: getDefaultTripCover(tripDestination),
        description,
      })
      dismissJob() // this draft is used; do not offer it again on the next visit
      router.push(`/trips/${trip_id}`)
    } catch (err) {
      setResolving(false)
      setFormError(
        err instanceof ApiError ? err.message : "Couldn't create the trip. Nothing was saved, so try again.",
      )
    }
  }, [result, destination, venue, create, router, selectedKeys, dismissJob])

  const saving = create.isPending || resolving
  const noSelection = result !== null && selectedKeys.size === 0

  // Warn before leaving while the trip is being saved (generation keeps running without us).
  const busy = saving
  useEffect(() => {
    if (!busy) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [busy])

  return (
    <LocationProviderBoundary>
    <main className="mx-auto w-full max-w-3xl px-margin-mobile pb-28 pt-6 md:px-margin-desktop md:pt-8">

      <header className="mb-6">
        <h1 className="text-balance font-display text-3xl font-extrabold leading-tight text-foreground md:text-4xl">
          Plan a trip <span className="text-muted-foreground">with AI</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold text-muted-foreground md:text-base">
          Answer a few questions and get a day-by-day draft (up to {MAX_DAYS} days). You pick what to keep.
        </p>
        <QuotaBadge className="mt-3" />
      </header>

      {/* Wizard stays mounted during generation; the overlay covers it (pattern 3 above). */}
      {!result ? (
        <div className={cn("relative", generate.running && "min-h-[320px]")}>
          {generate.running && (
            <div className="absolute inset-0 z-20 rounded-3xl border bg-card p-6 shadow-card">
              <GeneratingItinerarySkeleton startedAt={generate.job?.created_at} />
            </div>
          )}
          <div className={generate.running ? "pointer-events-none select-none opacity-20" : ""}>
            <GenerateChatWizard
              key={generationKey}
              onSubmit={handleGenerate}
              disabled={generate.running}
              initialValues={initialValues}
            />
          </div>
          {(formError ?? generate.error) && (
            <div role="alert" className="mt-4 flex items-start gap-3 rounded-2xl bg-destructive-bg p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="text-foreground">{formError ?? generate.error}</p>
                <Button variant="link" className="mt-1 h-auto" onClick={resetGeneration}>
                  Try again
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <DraftPreview draft={result.draft} onSelectionChange={setSelectedKeys} />

          {formError && (
            <div role="alert" className="flex items-start gap-3 rounded-2xl bg-destructive-bg p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
              <p className="text-sm text-foreground">{formError}</p>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              size="lg"
              onClick={resetGeneration}
              disabled={saving}
            >
              Start over
            </Button>
            <Button size="lg" onClick={handleCreate} disabled={saving || noSelection}>
              {saving ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  {resolving ? "Finding the places…" : "Creating the trip…"}
                </>
              ) : noSelection ? (
                "Select at least one place"
              ) : (
                <>
                  <Check aria-hidden="true" />
                  Create trip
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </main>
    </LocationProviderBoundary>
  )
}

function GenerateTripPageFallback() {
  return (
    <div className="mx-auto w-full max-w-3xl px-margin-mobile pt-6 md:px-margin-desktop" aria-hidden="true">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
      <div className="mt-6 h-72 animate-pulse rounded-3xl bg-muted" />
    </div>
  )
}
