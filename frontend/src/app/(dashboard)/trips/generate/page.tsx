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
import { GenerateChatWizard } from "@/features/trip/components/GenerateChatWizard"
import { GeneratingItinerarySkeleton } from "@/features/trip/components/GeneratingItinerarySkeleton"
import { ShimmerOverlay } from "@/features/summary/components/ShimmerOverlay"
import {
  useCreateTripFromDraft,
  useGenerateTripDraft,
} from "@/features/trip/hooks/useTrips"
import { resolveDraftLocations } from "@/features/trip/lib/resolveDraftLocations"
import { resolveDestinationMeta } from "@/features/trip/lib/resolveDestinationMeta"
import { primaryTripActionButtonClassName } from "@/features/trip/lib/styles"
import type { GenerateTripInput, GenerateTripResponse } from "@/features/trip/types"
import { ApiError } from "@/lib/api"
import { useCooldown } from "@/lib/useCooldown"

const MAX_DAYS = 10
export default function GenerateTripPage() {
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

  const generate = useGenerateTripDraft()
  const create = useCreateTripFromDraft()
  const cooldown = useCooldown("generate-trip")

  // Prevent concurrent generate calls AND re-generation after success.
  const generatingRef = useRef(false)
  const draftReceivedRef = useRef(false)
  const submittedRef = useRef(false) // one-shot: true once mutate fires, never reset

  // Stable refs so useCallback doesn't depend on mutation objects (avoids
  // stale-closure double-call when TanStack Query re-renders with isPending).
  const generateMutateRef = useRef(generate.mutate)
  const cooldownRef = useRef(cooldown)
  useEffect(() => { generateMutateRef.current = generate.mutate }, [generate.mutate])
  useEffect(() => { cooldownRef.current = cooldown }, [cooldown])

  // Key to force fresh wizard mount when user retries after error.
  const [generationKey, setGenerationKey] = useState(0)

  // Reset the received flag when user starts a fresh generation.
  const resetGeneration = useCallback(() => {
    generatingRef.current = false
    draftReceivedRef.current = false
    submittedRef.current = false
    setResult(null)
    setFormError(null)
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
        // Start frontend cooldown (backend also enforces, this is UX guard)
        cooldownRef.current.startCooldown(300)
      },
      onError: (err) => {
        // Handle rate-limit cooldown from backend 429
        const retryAfter = (err as { retry_after_seconds?: number })?.retry_after_seconds
        if (retryAfter && retryAfter > 0) {
          cooldownRef.current.startCooldown(retryAfter)
        }
        if (!draftReceivedRef.current) {
          setFormError(
            err instanceof ApiError ? err.message : "Failed to generate itinerary. Please try again.",
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
      let draft = result.draft
      let description = ""
      try {
        draft = await resolveDraftLocations(result.draft, destination)
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
        cover_image_url: "",
        description,
      })
      router.push(`/trips/${trip_id}/overview`)
    } catch (err) {
      setResolving(false)
      setFormError(
        err instanceof ApiError ? err.message : "Failed to save trip. Please try again.",
      )
    }
  }, [result, destination, create, router])

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
    <LocationProviderBoundary>
    <div className="mx-auto max-w-3xl w-full px-margin-mobile md:px-margin-desktop pt-8 pb-28">
      <BackLink href="/dashboard" className="mb-6" />

      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-chromatic-aurora to-chromatic-ocean text-white shadow-sm shadow-primary/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M3 5h4"/><path d="M19 17v4"/><path d="M17 19h4"/></svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Generate Trip with AI
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Answer a few questions and let AI build your starter itinerary. Up to {MAX_DAYS} days.
            </p>
          </div>
        </div>
        {/* Cooldown indicator */}
        {cooldown.remaining > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Cooldown: {Math.ceil(cooldown.remaining / 60)}m {cooldown.remaining % 60}s</span>
          </div>
        )}
      </header>

      {/* Wizard stays mounted during generation — no unmount/remount cycle */}
      {!result ? (
        <div className="relative animate-fade-in-up">
          {/* Skeleton overlay during generation — covers wizard but doesn't unmount it */}
          {generate.isPending && (
            <ShimmerOverlay
              active
              className="absolute inset-0 z-20 rounded-2xl border border-border/40 bg-card/95 p-6 shadow-sm backdrop-blur-md"
            >
              <GeneratingItinerarySkeleton days={pendingDays} />
            </ShimmerOverlay>
          )}
          <div className={generate.isPending ? "opacity-20 pointer-events-none select-none" : ""}>
            <GenerateChatWizard
              key={generationKey}
              onSubmit={handleGenerate}
              disabled={generate.isPending}
              initialValues={initialValues}
            />
          </div>
          {formError && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive shrink-0 mt-0.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-destructive">{formError}</p>
                <button
                  type="button"
                  onClick={resetGeneration}
                  className="mt-2 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                >
                  Try Again →
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in-up">
          <DraftPreview draft={result.draft} />

          {formError && (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
              <p className="text-sm text-destructive">{formError}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              className={primaryTripActionButtonClassName}
            >
              {saving ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  {resolving ? "Resolving locations…" : "Saving…"}
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
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
              className="flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-2xl border border-border/50 px-8 py-3.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground hover:bg-muted disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
    </LocationProviderBoundary>
  )
}

function GenerateTripPageFallback() {
  return (
    <div className="mx-auto w-full max-w-3xl px-margin-mobile pt-8 md:px-margin-desktop">
      <div className="h-10 w-28 animate-pulse rounded-xl bg-muted" />
      <div className="mt-8 h-72 animate-pulse rounded-2xl border border-border/40 bg-muted/40" />
    </div>
  )
}
