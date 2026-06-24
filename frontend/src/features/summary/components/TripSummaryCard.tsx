"use client"

import { useMemo } from "react"
import { Sparkles, Loader2, RefreshCw, AlertCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  useTripSummary,
  useGenerateSummary,
  useDeleteSummary,
} from "../hooks/useTripSummary"
import { GeneratingIndicator } from "./GeneratingIndicator"
import { ShimmerOverlay } from "./ShimmerOverlay"
import type { TripSummary } from "../types"

function formatSimpleMarkdown(text: string) {
  return text
    .replace(/^### (.*$)/gim, "<h3 class='text-lg font-semibold mt-4 mb-2'>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2 class='text-xl font-semibold mt-5 mb-3'>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1 class='text-2xl font-bold mt-6 mb-4'>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^- (.*$)/gim, "<li class='ml-5 list-disc'>$1</li>")
    .replace(/\n/g, "<br />")
}

interface TripSummaryCardProps {
  tripId: string
}

function SummaryContent({ summary, tripId }: { summary: TripSummary; tripId: string }) {
  const deleteSummary = useDeleteSummary(tripId)
  const html = useMemo(() => formatSimpleMarkdown(summary.content), [summary.content])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
            AI Summary
          </span>
          <span>· Generated {new Date(summary.updated_at).toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-destructive hover:text-destructive"
            onClick={() => deleteSummary.mutate()}
            disabled={deleteSummary.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
        </div>
      </div>
      <div
        className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

export function TripSummaryCard({ tripId }: TripSummaryCardProps) {
  const { data: summary, isLoading } = useTripSummary(tripId)
  const generate = useGenerateSummary(tripId)

  const errStatus = (generate.error as { status?: number })?.status
  const isRateLimited = generate.isError && errStatus === 429
  // Any non-rate-limit failure (503 LLM unavailable, network, 500, etc.)
  const isGenerateError = generate.isError && !isRateLimited

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card p-6 shadow-sm">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  if (!summary) {
    return (
      <ShimmerOverlay
        active={generate.isPending}
        className="rounded-2xl border border-border/40 bg-card p-6 text-center shadow-sm md:p-8"
      >
        {generate.isPending ? (
          <GeneratingIndicator />
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              AI Trip Summary
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Generate a personalized AI summary of your trip, itinerary, stays, transport, and budget.
            </p>
            {isGenerateError && (
              <div className="mx-auto mb-4 flex max-w-md items-start gap-2 rounded-lg bg-destructive/10 p-3 text-left text-xs text-destructive sm:text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Couldn&apos;t generate summary</p>
                  <p className="opacity-90">
                    Something went wrong while generating. Please try again in a moment.
                  </p>
                </div>
              </div>
            )}
            <Button onClick={() => generate.mutate()} className="gap-2">
              <Sparkles className="h-4 w-4" />
              {isGenerateError ? "Try Again" : "Generate Summary"}
            </Button>
          </>
        )}
      </ShimmerOverlay>
    )
  }

  return (
    <ShimmerOverlay
      active={generate.isPending}
      className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card p-4 shadow-sm sm:p-6 md:p-8"
    >
      <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
          <h3 className="text-base font-bold text-foreground sm:text-lg md:text-xl">
            AI Trip Summary
          </h3>
        </div>
        {generate.isPending && (
          <div className="w-full sm:w-auto sm:shrink-0">
            <GeneratingIndicator compact />
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="shrink-0 gap-1.5 text-xs sm:text-sm"
        >
          {generate.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin sm:h-3.5 sm:w-3.5" />
          ) : (
            <RefreshCw className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          )}
          <span className="hidden sm:inline">Regenerate</span>
          <span className="sm:hidden">Regenerate</span>
        </Button>
      </div>

      {isRateLimited && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100 sm:mb-4 sm:p-3 sm:text-sm">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
          <div>
            <p className="font-medium">Please wait a moment</p>
            <p className="text-[10px] opacity-90 sm:text-xs">
              You can regenerate a summary once every 5 minutes. Come back shortly!
            </p>
          </div>
        </div>
      )}

      {isGenerateError && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive sm:mb-4 sm:p-3 sm:text-sm">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
          <div>
            <p className="font-medium">Couldn&apos;t regenerate summary</p>
            <p className="text-[10px] opacity-90 sm:text-xs">
              Something went wrong. The previous summary is still shown below — try regenerating again in a moment.
            </p>
          </div>
        </div>
      )}

      <SummaryContent summary={summary} tripId={tripId} />
    </ShimmerOverlay>
  )
}
