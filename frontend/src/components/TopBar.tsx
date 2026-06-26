"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface TopBarProps {
  title?: string
  subtitle?: string
  backHref?: string
  rightAction?: React.ReactNode
  className?: string
  transparent?: boolean
  /** 0–100 progress value; renders a thin bar at the bottom of TopBar */
  progress?: number
}

/**
 * Universal sticky sub-page header with back button + title/subtitle.
 * Iter 25 — use Link for backHref (prefetch), button for history.back()
 * Iter 26 — better title hierarchy: h2 instead of h1 (page h1 is in content)
 * Iter 27 — progress bar: gradient, smoother transition
 * Iter 28 — rightAction slot: no divider when title is absent
 */
export function TopBar({
  title,
  subtitle,
  backHref,
  rightAction,
  className,
  transparent,
  progress,
}: TopBarProps) {
  const router = useRouter()

  return (
    <div
      className={cn(
        "sticky z-40 flex items-center gap-3 px-4 py-3",
        "top-0 md:top-14",
        "md:px-8",
        !transparent && [
          "bg-background/90 backdrop-blur-xl",
          "border-b border-border/20",
          "shadow-[0_1px_0_0_hsl(var(--border)/0.15)]",
        ],
        "relative",
        className,
      )}
    >
      {/* Iter 25 — back: Link for known href, button for history.back() */}
      {backHref ? (
        <Link
          href={backHref}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            "border border-border/40 bg-background text-foreground",
            "shadow-sm",
            "transition-all duration-150 hover:bg-muted hover:border-border active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
          aria-label={`Back to ${title ?? "previous page"}`}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => router.back()}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            "border border-border/40 bg-background text-foreground",
            "shadow-sm",
            "transition-all duration-150 hover:bg-muted hover:border-border active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      {/* Iter 26 — title/subtitle: h2 for semantic hierarchy */}
      <div className="flex-1 min-w-0">
        {title && (
          <h2
            className="text-base font-semibold text-foreground truncate leading-tight"
            title={title}
          >
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate mt-0.5 leading-tight">
            {subtitle}
          </p>
        )}
      </div>

      {!title && <div className="flex-1" aria-hidden="true" />}

      {/* Iter 28 — right action slot: show divider only when title exists */}
      {rightAction && (
        <>
          {title && (
            <div
              className="h-6 w-px bg-border/40 shrink-0"
              aria-hidden="true"
            />
          )}
          <div className="flex items-center gap-2 shrink-0">
            {rightAction}
          </div>
        </>
      )}

      {/* Iter 27 — progress bar: gradient + smoother easing */}
      {typeof progress === "number" && (
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-border/15"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary via-[hsl(250,70%,55%)] to-[hsl(200,90%,60%)] transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  )
}
