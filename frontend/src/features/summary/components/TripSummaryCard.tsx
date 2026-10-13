"use client"

import { useEffect } from "react"
import ReactMarkdown from "react-markdown"
import type { Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { AlertCircle, AlertTriangle, ExternalLink, Loader2, MoreHorizontal, RefreshCw, Sparkles, Trash2 } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { QuotaBadge } from "@/components/QuotaBadge"
import { sanitizeText } from "@/lib/sanitize"
import { useDeleteSummary, useGenerateSummary, useTripSummary } from "../hooks/useTripSummary"
import { GeneratingIndicator } from "./GeneratingIndicator"

// Markdown from the AI rendered with the app's type scale.
const markdownComponents: Components = {
  table: (props) => (
    <div className="my-4 overflow-x-auto rounded-lg border">
      <table className="min-w-full text-sm">{props.children}</table>
    </div>
  ),
  thead: (props) => <thead className="bg-muted">{props.children}</thead>,
  th: (props) => <th className="px-3 py-2 text-left font-semibold text-foreground">{props.children}</th>,
  td: (props) => <td className="border-t px-3 py-2 text-foreground tabular-nums">{props.children}</td>,
  a: (props) => (
    <a
      href={props.href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 text-primary underline underline-offset-2 hover:text-primary/80"
    >
      {props.children}
      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
    </a>
  ),
  h1: (props) => <h3 className="mb-2 mt-6 text-xl font-semibold text-foreground first:mt-0">{props.children}</h3>,
  h2: (props) => <h3 className="mb-2 mt-6 text-lg font-semibold text-foreground first:mt-0">{props.children}</h3>,
  h3: (props) => <h4 className="mb-1.5 mt-5 text-base font-semibold text-foreground">{props.children}</h4>,
  p: (props) => <p className="my-2 leading-relaxed text-foreground">{props.children}</p>,
  ul: (props) => <ul className="my-2 ml-5 list-disc space-y-1 text-foreground">{props.children}</ul>,
  ol: (props) => <ol className="my-2 ml-5 list-decimal space-y-1 text-foreground">{props.children}</ol>,
  li: (props) => <li className="pl-1 leading-relaxed">{props.children}</li>,
  strong: (props) => <strong className="font-semibold text-foreground">{props.children}</strong>,
  blockquote: (props) => (
    <blockquote className="my-3 border-l-2 border-border pl-4 text-muted-foreground">{props.children}</blockquote>
  ),
  hr: () => <hr className="my-6 border-border" />,
  code: (props) => {
    const { className, children } = props as React.HTMLAttributes<HTMLElement>
    if (!className) return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">{children}</code>
    return (
      <pre className="my-3 overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
        <code className={className}>{children}</code>
      </pre>
    )
  },
}

const GENERATED_AT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

/** AI summary of the whole trip: generate, update when the trip changes, delete. */
export function TripSummaryCard({ tripId }: { tripId: string }) {
  const { data: summary, isLoading } = useTripSummary(tripId)
  const generate = useGenerateSummary(tripId)
  const deleteSummary = useDeleteSummary(tripId)

  const errStatus = (generate.error as { status?: number })?.status
  const isRateLimited = generate.isError && errStatus === 429
  const isGenerateError = generate.isError && !isRateLimited

  // Warn before leaving while a summary is being generated.
  useEffect(() => {
    if (!generate.isPending) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [generate.isPending])

  if (isLoading) return <div className="h-48 animate-pulse rounded-xl bg-muted" aria-label="Loading summary" />

  const errors = (
    <>
      {isRateLimited && (
        <Notice tone="warning" title="Daily AI limit reached">
          You&apos;ve used today&apos;s AI generations. The limit resets at the time shown below the button.
        </Notice>
      )}
      {isGenerateError && (
        <Notice tone="error" title="Couldn't generate the summary">
          {summary ? "The previous summary is still shown below. " : ""}Try again in a moment.
        </Notice>
      )}
    </>
  )

  if (!summary) {
    return (
      <section className="mx-auto max-w-3xl rounded-xl border bg-card p-6 text-center md:p-8" aria-busy={generate.isPending}>
        {generate.isPending ? (
          <GeneratingIndicator />
        ) : (
          <>
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-3 text-lg font-semibold text-foreground">Trip summary</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              A short write-up of this trip: the highlights of each day, where you&apos;re staying, how you&apos;re
              getting around, and how the budget looks.
            </p>
            <div className="mx-auto mt-4 max-w-md text-left">{errors}</div>
            <div className="mt-5 flex flex-col items-center gap-2">
              <Button onClick={() => generate.mutate()}>
                <Sparkles aria-hidden="true" />
                {isGenerateError ? "Try again" : "Generate summary"}
              </Button>
              <QuotaBadge />
            </div>
          </>
        )}
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-3xl rounded-xl border bg-card" aria-busy={generate.isPending}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground">Trip summary</h2>
          <p className="text-sm text-muted-foreground tabular-nums">
            {generate.isPending ? (
              <GeneratingIndicator compact />
            ) : (
              <>Generated {GENERATED_AT.format(new Date(summary.updated_at))}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={summary.is_outdated ? "default" : "outline"}
            size="sm"
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
          >
            {generate.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
            {summary.is_outdated ? "Update summary" : "Regenerate"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Summary actions"
              className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "text-muted-foreground" })}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                className="min-h-10 px-3 text-sm"
                variant="destructive"
                disabled={deleteSummary.isPending || generate.isPending}
                onClick={() => deleteSummary.mutate()}
              >
                <Trash2 aria-hidden="true" />
                Delete summary
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="px-4 py-4 sm:px-6">
        <div className="mb-3 flex justify-end">
          <QuotaBadge />
        </div>
        {summary.is_outdated && !generate.isPending && (
          <Notice tone="warning" title="Your trip changed since this summary">
            It may not include your latest days, bookings or expenses. Update it when you&apos;re ready.
          </Notice>
        )}
        {errors}
        <article className={generate.isPending ? "opacity-60 transition-opacity" : undefined}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {sanitizeText(summary.content)}
          </ReactMarkdown>
        </article>
      </div>
    </section>
  )
}

function Notice({ tone, title, children }: { tone: "warning" | "error"; title: string; children: React.ReactNode }) {
  const Icon = tone === "warning" ? AlertTriangle : AlertCircle
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "warning"
          ? "mb-4 flex items-start gap-2 rounded-lg border border-warning/50 bg-warning-bg p-3 text-sm text-foreground"
          : "mb-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-foreground"
      }
    >
      <Icon className={tone === "warning" ? "mt-0.5 h-4 w-4 shrink-0 text-warning" : "mt-0.5 h-4 w-4 shrink-0 text-destructive"} aria-hidden="true" />
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground">{children}</p>
      </div>
    </div>
  )
}
