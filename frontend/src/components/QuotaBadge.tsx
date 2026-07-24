"use client"

import { useMemo } from "react"
import { useAutogenQuota } from "@/features/trip/hooks/useTrips"
import { cn } from "@/lib/utils"

interface Props {
  className?: string
}

/** Format UTC ISO string to WIB time (HH:MM). */
function toWIB(iso: string): string {
  const d = new Date(iso)
  // WIB = UTC+7
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000)
  return wib.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })
}

/**
 * QuotaBadge shows remaining AI generations + WIB reset time.
 * Place near any AI generate button (generate trip, build-around, summary).
 * Hidden when quota is disabled or loading.
 */
export function QuotaBadge({ className }: Props) {
  const { data, isLoading } = useAutogenQuota()

  const content = useMemo(() => {
    if (isLoading || !data || data.disabled || data.limit <= 0) return null

    const { limit, remaining, resets_at } = data
    const exhausted = remaining <= 0
    const low = !exhausted && remaining <= 2
    const resetWIB = toWIB(resets_at)

    return {
      text: exhausted
        ? `0/${limit} · resets ${resetWIB} WIB`
        : `${remaining}/${limit} · resets ${resetWIB} WIB`,
      exhausted,
      low,
    }
  }, [data, isLoading])

  if (!content) return null

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        content.exhausted
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : content.low
            ? "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            : "border-border bg-muted/50 text-muted-foreground",
        className,
      )}
      aria-label={`${content.text}`}
    >
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 rounded-full",
          content.exhausted ? "bg-destructive" : content.low ? "bg-amber-500" : "bg-emerald-500",
        )}
      />
      {content.text}
    </span>
  )
}
