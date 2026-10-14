"use client"
// ══════════════════════════════════════════════════════════════════════════════
// AI Generate Trip Page — Critical Patterns (DO NOT REGRESS)
// ══════════════════════════════════════════════════════════════════════════════
//
// 1. Mutation pattern: `mutate(input, { onSuccess, onError, onSettled })`
//    NEVER use `await mutateAsync()` — causes render-timing issues with
//    React 18 batching on long-running (30-55s) AI mutations.
//
// 2. Triple guard: generatingRef + draftReceivedRef + result !== null
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
import { BackLink } from "@/components/BackLink"
import { useRouter, useSearchParams } from "next/navigation"
import { LocationProviderBoundary } from "@/features/location/components/LocationProviderBoundary"
import { DraftPreview } from "@/features/trip/components/DraftPreview"
import { cn } from "@/lib/utils"
import { GenerateChatWizard } from "@/features/trip/components/GenerateChatWizard"
import { GeneratingItinerarySkeleton } from "@/features/trip/components/GeneratingItinerarySkeleton"
import {
  useCreateTripFromDraft,
  useGenerateTripDraft,
  useAutogenQuota,
} from "@/features/trip/hooks/useTrips"
import { resolveDraftLocations } from "@/features/trip/lib/resolveDraftLocations"
import { resolveDestinationMeta } from "@/features/trip/lib/resolveDestinationMeta"
import { getDefaultTripCover } from "@/features/trip/lib/cover"
import { suggestionKey } from "@/features/trip/lib/suggestionKey"
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

  const [result, setResult] = useState<GenerateTripResponse | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingDays, setPendingDays] = useState(4)
  const [destination, setDestination] = useState("")
  const [resolving, setResolving] = useState(false)
  // Curation: which AI-suggested places the user wants to keep. Lifted here so
  // handleCreate can filter the draft before resolving/creating. Default empty
  // until DraftPreview reports its initial all-selected state.
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())

  const generate = useGenerateTripDraft()
  const create = useCreateTripFromDraft()
  const quota = useAutogenQuota()

  // Prevent concurrent generate calls AND re-generation after success.
  const generatingRef = useRef(false)
  const draftReceivedRef = useRef(false)
  const submittedRef = useRef(false) // one-shot: true once mutate fires, never reset

  // Stable refs so useCallback doesn't depend on mutation objects (avoids
  // stale-closure double-call when TanStack Query re-renders with isPending).
  const generateMutateRef = useRef(generate.mutate)
  // Keep a ref to the quota query client for invalidation in callbacks.
  const quotaRef = useRef(quota)
  useEffect(() => { generateMutateRef.current = generate.mutate }, [generate.mutate])
  useEffect(() => { quotaRef.current = quota }, [quota])

  // Key to force fresh wizard mount when user retries after error.
  const [generationKey, setGenerationKey] = useState(0)

  // Reset the received flag when user starts a fresh generation.
  const resetGeneration = useCallback(() => {
    generatingRef.current = false
    draftReceivedRef.current = false
    submittedRef.current = false
    setResult(null)
    setFormError(null)
    setSelectedKeys(new Set())
    setGenerationKey((k) => k + 1)
  }, [])

  // ── Generate using onSuccess/onError callbacks (no async/await) ──
  // Uses stable refs (generateMutateRef, cooldownRef) so this callback never
  // recreates due to TanStack Query re-renders — eliminating the stale-closure
  // double-call that caused 429s.
  const resultRef = useRef(result)
  useEffect(() => { resultRef.current = result }, [result])

  const handleGenerate = useCallback((input: GenerateTripInput) => {
    // Quadruple guard — prevents any possibility of double-submit
    if (submittedRef.current) return
    if (generatingRef.current) return
    if (draftReceivedRef.current) return
    if (resultRef.current !== null) return

    submittedRef.current = true
    generatingRef.current = true
    setFormError(null)
    setDestination(input.destination)

    const start = new Date(input.start_date)
    const end = new Date(input.end_date)
    const dayCount = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
    setPendingDays(Number.isFinite(dayCount) && dayCount > 0 ? Math.min(dayCount, MAX_DAYS) : 4)

    generateMutateRef.current(input, {
      onSuccess: (data) => {
        draftReceivedRef.current = true
        setResult(data)
        // Invalidate quota so the badge updates after a successful generation.
        quotaRef.current.refetch()
      },
      onError: (err) => {
        // On daily quota exceeded (429), the backend already consumed a slot
        // (handled by refund on server error). Just show the message.
        if (!draftReceivedRef.current) {
          setFormError(
            err instanceof ApiError ? err.message : "Couldn't generate the itinerary. Your answers are kept, so try again.",
          )
        }
      },
      onSettled: () => {
        generatingRef.current = false
      },
    })
  }, []) // stable — no deps that change on re-render

  const handleCreate = useCallback(async () => {
    if (!result) return
    setFormError(null)
    try {
      setResolving(true)
      // Filter the AI draft to only the user's selected places before
      // resolving/creating. Days are preserved (contiguity required) but
      // may end up empty if the user deselected everything in a day.
      const curatedDraft: typeof result.draft = {
        ...result.draft,
        days: result.draft.days.map((d) => ({
          ...d,
          activities: d.activities.filter((a) => selectedKeys.has(suggestionKey(a))),
        })),
      }
      let draft = curatedDraft
      let description = ""
      try {
        draft = await resolveDraftLocations(curatedDraft, destination)
        const meta = await resolveDestinationMeta(destination)
        if (meta) {
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
        cover_image_url: getDefaultTripCover(destination),
        description,
      })
      router.push(`/trips/${trip_id}`)
    } catch (err) {
      setResolving(false)
      setFormError(
        err instanceof ApiError ? err.message : "Couldn't create the trip. Nothing was saved, so try again.",
      )
    }
  }, [result, destination, create, router, selectedKeys])

  const saving = create.isPending || resolving
  const noSelection = result !== null && selectedKeys.size === 0

  // Warn before leaving during generation
  const busy = generate.isPending || saving
  useEffect(() => {
    if (!busy) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [busy])

  return (
    <LocationProviderBoundary>
    <main className="mx-auto w-full max-w-3xl px-margin-mobile pb-28 pt-6 md:px-margin-desktop">
      <BackLink href="/trips" label="Back to Trips" className="mb-4" />

      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Generate a trip with AI</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Answer a few questions and get a day-by-day draft (up to {MAX_DAYS} days). You pick what to keep.
        </p>
        <QuotaBadge className="mt-3" />
      </header>

      {/* Wizard stays mounted during generation; the overlay covers it (pattern 3 above). */}
      {!result ? (
        <div className={cn("relative", generate.isPending && "min-h-[320px]")}>
          {generate.isPending && (
            <div className="absolute inset-0 z-20 rounded-xl border bg-card p-6">
              <GeneratingItinerarySkeleton days={pendingDays} />
            </div>
          )}
          <div className={generate.isPending ? "pointer-events-none select-none opacity-20" : ""}>
            <GenerateChatWizard
              key={generationKey}
              onSubmit={handleGenerate}
              disabled={generate.isPending}
              initialValues={initialValues}
            />
          </div>
          {formError && (
            <div role="alert" className="mt-4 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="text-foreground">{formError}</p>
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
            <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
              <p className="text-sm text-foreground">{formError}</p>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setResult(null)
                setFormError(null)
              }}
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
      <div className="mt-6 h-72 animate-pulse rounded-xl bg-muted" />
    </div>
  )
}
