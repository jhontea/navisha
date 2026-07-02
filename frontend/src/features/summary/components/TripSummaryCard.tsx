"use client"

import { useEffect } from "react"
import ReactMarkdown from "react-markdown"
import type { Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { Sparkles, Loader2, RefreshCw, AlertCircle, Trash2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { sanitizeText } from "@/lib/sanitize"
import { cn } from "@/lib/utils"
import { primaryTripActionButtonClassName } from "@/features/trip/lib/styles"
import {
  useTripSummary,
  useGenerateSummary,
  useDeleteSummary,
} from "../hooks/useTripSummary"
import { GeneratingIndicator } from "./GeneratingIndicator"
import { ShimmerOverlay } from "./ShimmerOverlay"
import type { TripSummary } from "../types"

const summaryActionButtonClassName = cn(
  primaryTripActionButtonClassName,
  "flex-none rounded-2xl px-5 py-2 text-sm shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30 sm:flex-none",
)

// Custom component mapping for rich rendering
const markdownComponents: Components = {
  table: (props) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full text-sm">{props.children}</table>
    </div>
  ),
  thead: (props) => (
    <thead className="bg-muted/50">{props.children}</thead>
  ),
  th: (props) => (
    <th className="px-4 py-2 text-left font-semibold text-foreground">{props.children}</th>
  ),
  td: (props) => (
    <td className="border-t border-border px-4 py-2 text-foreground/80">{props.children}</td>
  ),
  a: (props) => (
    <a
      href={props.href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:text-primary/80 inline-flex items-center gap-0.5"
    >
      {props.children}
      <ExternalLink className="h-3 w-3" />
    </a>
  ),
  h1: (props) => (
    <h1 className="mt-6 mb-3 text-2xl font-bold text-foreground">{props.children}</h1>
  ),
  h2: (props) => (
    <h2 className="mt-5 mb-3 text-xl font-semibold text-foreground">{props.children}</h2>
  ),
  h3: (props) => (
    <h3 className="mt-4 mb-2 text-lg font-semibold text-foreground">{props.children}</h3>
  ),
  p: (props) => (
    <p className="my-2 leading-relaxed text-foreground/85">{props.children}</p>
  ),
  ul: (props) => (
    <ul className="my-2 ml-5 list-disc space-y-1 text-foreground/85">{props.children}</ul>
  ),
  ol: (props) => (
    <ol className="my-2 ml-5 list-decimal space-y-1 text-foreground/85">{props.children}</ol>
  ),
  li: (props) => (
    <li className="pl-1">{props.children}</li>
  ),
  strong: (props) => (
    <strong className="font-semibold text-foreground">{props.children}</strong>
  ),
  blockquote: (props) => (
    <blockquote className="my-3 border-l-4 border-primary/30 pl-4 italic text-muted-foreground">
      {props.children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-border" />,
  code: (props) => {
    const { className, children } = props as React.HTMLAttributes<HTMLElement>
    const isInline = !className
    if (isInline) {
      return (
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground/85">
          {children}
        </code>
      )
    }
    return (
      <pre className="my-3 overflow-x-auto rounded-lg bg-muted/50 p-4 text-sm font-mono">
        <code className={className}>{children}</code>
      </pre>
    )
  },
}

interface TripSummaryCardProps {
  tripId: string
}

function SummaryContent({ summary, tripId }: { summary: TripSummary; tripId: string }) {
  const deleteSummary = useDeleteSummary(tripId)

  return (
    <div className="space-y-4">
      {/* Header row: badge + timestamp | delete */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary sm:text-sm">
            AI Summary
          </span>
          <span className="text-[11px] text-muted-foreground sm:text-xs">
            {new Date(summary.updated_at).toLocaleString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-destructive hover:text-destructive"
          onClick={() => deleteSummary.mutate()}
          disabled={deleteSummary.isPending}
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Clear</span>
        </Button>
      </div>
      <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={markdownComponents}
        >
          {sanitizeText(summary.content)}
        </ReactMarkdown>
      </div>
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

  // Warn before leaving during summary generation
  useEffect(() => {
    if (!generate.isPending) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [generate.isPending])

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
            <Button
              onClick={() => generate.mutate()}
              disabled={generate.isPending}
              className={summaryActionButtonClassName}
            >
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
      className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card p-4 shadow-sm md:p-6 lg:p-8"
    >
      {/* Header: icon + label | (generating indicator) | regenerate button */}
      <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 md:mb-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 flex-shrink-0 text-primary sm:h-5 sm:w-5" />
          <h3 className="text-sm font-bold leading-tight text-foreground sm:text-base md:text-lg">
            AI Trip Summary
          </h3>
        </div>
        {generate.isPending && (
          <div className="w-full shrink-0 sm:w-auto">
            <GeneratingIndicator compact />
          </div>
        )}
        <Button
          size="sm"
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className={cn(
            summaryActionButtonClassName,
            "w-full px-4 py-2 text-xs sm:w-auto sm:text-sm md:gap-2",
          )}
        >
          {generate.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 flex-shrink-0" />
          )}
          <span className="sm:hidden">Regenerate</span>
          <span className="hidden sm:inline">Regenerate</span>
        </Button>
      </div>

      {isRateLimited && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-chromatic-amber/10 p-2 text-xs text-chromatic-amber sm:mb-4 sm:p-3 sm:text-sm">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4" />
          <div>
            <p className="font-medium text-[11px] sm:text-sm">Please wait a moment</p>
            <p className="text-[10px] opacity-90 sm:text-xs">
              You can regenerate a summary once every 5 minutes. Come back shortly!
            </p>
          </div>
        </div>
      )}

      {isGenerateError && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive sm:mb-4 sm:p-3 sm:text-sm">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4" />
          <div>
            <p className="font-medium text-[11px] sm:text-sm">Couldn&apos;t regenerate summary</p>
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
