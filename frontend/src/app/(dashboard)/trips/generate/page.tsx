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

import { useState, useEffect, useRef, useCallback } from "react"
import { BackLink } from "@/components/BackLink"
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
import { useCooldown } from "@/lib/useCooldown"

const MAX_DAYS = 10
const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""

export default function GenerateTripPage() {
  const router = useRouter()

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
  // This avoids any Promise resolution timing issues with React state batching.
  const handleGenerate = useCallback((input: GenerateTripInput) => {
    // Quadruple guard — prevents any possibility of double-submit
    if (submittedRef.current) return
    if (generatingRef.current) return
    if (draftReceivedRef.current) return
    if (result !== null) return

    submittedRef.current = true
    generatingRef.current = true
    setFormError(null)
    setDestination(input.destination)

    const start = new Date(input.start_date)
    const end = new Date(input.end_date)
    const dayCount = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
    setPendingDays(Number.isFinite(dayCount) && dayCount > 0 ? Math.min(dayCount, MAX_DAYS) : 4)

    generate.mutate(input, {
      onSuccess: (data) => {
        draftReceivedRef.current = true
        setResult(data)
        // Start frontend cooldown (backend also enforces, this is UX guard)
        cooldown.startCooldown(300)
      },
      onError: (err) => {
        // Handle rate-limit cooldown from backend 429
        const retryAfter = (err as { retry_after_seconds?: number })?.retry_after_seconds
        if (retryAfter && retryAfter > 0) {
          cooldown.startCooldown(retryAfter)
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
  }, [generate, result, cooldown])

  const handleCreate = useCallback(async () => {
    if (!result) return
    setFormError(null)
    try {
      setResolving(true)
      let draft = result.draft
      let coverImageUrl = ""
      let description = ""
      try {
        draft = await resolveDraftLocations(result.draft, destination)
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
    <APIProvider apiKey={MAPS_API_KEY} libraries={["places"]}>
    <div className="mx-auto max-w-3xl w-full px-margin-mobile md:px-margin-desktop pt-8 pb-24">
      <BackLink href="/trips" variant="glass" className="mb-6" />

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
        {/* ── Cooldown indicator ── */}
        {cooldown.remaining > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-200">
            <span className="material-symbols-outlined text-lg">timer</span>
            <span>Cooldown: {Math.ceil(cooldown.remaining / 60)}m {cooldown.remaining % 60}s</span>
          </div>
        )}
      </header>

      {/* ── Wizard stays mounted during generation — no unmount/remount cycle ── */}
      {!result ? (
        <div className="relative">
          {/* Skeleton overlay during generation — covers wizard but doesn't unmount it */}
          {generate.isPending && (
            <div className="absolute inset-0 z-20 rounded-xl border border-surface-container-high bg-white shadow-sm p-6">
              <GeneratingItinerarySkeleton days={pendingDays} />
            </div>
          )}
          <div className={generate.isPending ? "opacity-30 pointer-events-none" : ""}>
            <GenerateChatWizard key={generationKey} onSubmit={handleGenerate} disabled={generate.isPending} />
          </div>
          {formError && (
            <div className="mt-4 space-y-3">
              <p className="text-body-sm text-destructive">{formError}</p>
              <button
                type="button"
                onClick={resetGeneration}
                className="text-sm font-medium text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
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
