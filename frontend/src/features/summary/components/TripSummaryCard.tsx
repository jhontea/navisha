"use client"

import { useEffect } from "react"
import ReactMarkdown from "react-markdown"
import type { Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { ExternalLink, Loader2, MoreHorizontal, RefreshCw, Sparkles, Square, Trash2 } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Notice } from "@/components/Notice"
import { QuotaBadge } from "@/components/QuotaBadge"
import { isOfflineError } from "@/lib/api"
import { sanitizeText } from "@/lib/sanitize"
import { cn } from "@/lib/utils"
import { NativeSelect } from "@/components/NativeSelect"
import { useDeleteSummary, useGenerateSummary, useSummaryLanguage, useTripSummary } from "../hooks/useTripSummary"
import type { SummaryLanguage } from "../types"
import { GeneratingIndicator } from "./GeneratingIndicator"

// Markdown from the AI rendered with the app's type scale.
const markdownComponents: Components = {
  table: (props) => (
    <div className="my-4 overflow-x-auto rounded-xl border">
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
  h1: (props) => <h3 className="mb-2 mt-6 font-display text-2xl font-extrabold text-foreground first:mt-0">{props.children}</h3>,
  h2: (props) => <h3 className="mb-2 mt-6 font-display text-xl font-extrabold text-foreground first:mt-0">{props.children}</h3>,
  h3: (props) => (
    <h4 className="mb-1.5 mt-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{props.children}</h4>
  ),
  p: (props) => <p className="my-2 leading-relaxed text-foreground">{props.children}</p>,
  // remark-gfm marks a "- [ ]" checklist with contains-task-list / task-list-item.
  ul: ({ className, children }) =>
    className?.includes("contains-task-list") ? (
      <ul className="my-2 space-y-1.5 text-foreground">{children}</ul>
    ) : (
      <ul className="my-2 ml-5 list-disc space-y-1 text-foreground">{children}</ul>
    ),
  ol: (props) => <ol className="my-2 ml-5 list-decimal space-y-1 text-foreground">{props.children}</ol>,
  li: ({ className, children }) =>
    className?.includes("task-list-item") ? (
      <li className="relative pl-7 leading-relaxed">{children}</li>
    ) : (
      <li className="pl-1 leading-relaxed">{children}</li>
    ),
  // Checklist box (read-only): an icon instead of a disabled checkbox.
  input: (props) =>
    props.type === "checkbox" ? <Square className="absolute left-0 top-1 h-4 w-4 text-primary" aria-hidden="true" /> : null,
  strong: (props) => <strong className="font-semibold text-foreground">{props.children}</strong>,
  blockquote: (props) => (
    <blockquote className="my-4 rounded-2xl bg-primary-soft px-4 py-1 text-foreground [&_p]:my-2">
      {props.children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-border" />,
  code: (props) => {
    const { className, children } = props as React.HTMLAttributes<HTMLElement>
    if (!className) return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">{children}</code>
    return (
      <pre className="my-3 overflow-x-auto rounded-2xl bg-muted p-4 font-mono text-sm">
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

function LanguageSelect({
  value,
  onChange,
  disabled,
  className,
}: {
  value: SummaryLanguage
  onChange: (language: SummaryLanguage) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <NativeSelect
      aria-label="Summary language"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as SummaryLanguage)}
      className={cn("w-auto", className)}
    >
      <option value="id">Indonesian</option>
      <option value="en">English</option>
    </NativeSelect>
  )
}

/** AI summary of the whole trip: generate, update when the trip changes, delete. */
export function TripSummaryCard({ tripId }: { tripId: string }) {
  const { data: summary, isLoading } = useTripSummary(tripId)
  const generate = useGenerateSummary(tripId)
  const [language, setLanguage] = useSummaryLanguage()
  const deleteSummary = useDeleteSummary(tripId)

  const errStatus = (generate.error as { status?: number })?.status
  const isRateLimited = generate.isError && errStatus === 429
  const isGenerateError = generate.isError && !isRateLimited && !isOfflineError(generate.error)

  // Warn before leaving while a summary is being generated.
  useEffect(() => {
    if (!generate.isPending) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [generate.isPending])

  if (isLoading) return <div className="h-48 animate-pulse rounded-2xl bg-muted" aria-label="Loading summary" />

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
      <section className="mx-auto max-w-3xl rounded-2xl border bg-card p-6 text-center shadow-card md:p-10" aria-busy={generate.isPending}>
        {generate.isPending ? (
          <GeneratingIndicator />
        ) : (
          <>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-3 font-display text-2xl font-extrabold text-foreground">Trip summary</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              A short write-up of this trip: the highlights of each day, where you&apos;re staying, how you&apos;re
              getting around, and how the budget looks.
            </p>
            <div className="mx-auto mt-4 max-w-md text-left">{errors}</div>
            <div className="mt-5 flex flex-col items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Language
                <LanguageSelect value={language} onChange={setLanguage} />
              </label>
              <Button onClick={() => generate.mutate(language)}>
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
    <section className="mx-auto max-w-4xl rounded-2xl border bg-card shadow-card" aria-busy={generate.isPending}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-extrabold text-foreground">Trip summary</h2>
          <p className="text-sm text-muted-foreground tabular-nums">
            {generate.isPending ? (
              <GeneratingIndicator compact />
            ) : (
              <>Generated {GENERATED_AT.format(new Date(summary.updated_at))}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <LanguageSelect
            value={language}
            onChange={setLanguage}
            disabled={generate.isPending}
            className="mr-1 min-h-9 py-1.5 md:min-h-9"
          />
          <Button
            variant={summary.is_outdated ? "default" : "outline"}
            size="sm"
            onClick={() => generate.mutate(language)}
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
