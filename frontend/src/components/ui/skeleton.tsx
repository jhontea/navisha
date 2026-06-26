import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
  variant?: "default" | "glass" | "card" | "text" | "avatar" | "button"
}

/** Glass skeleton loader — shimmer overlay on glass background.
 *  Replaces gray animate-pulse divs with styled placeholders. */
export function Skeleton({ className, variant = "default" }: SkeletonProps) {
  const baseClass = "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent"

  const variants: Record<string, string> = {
    default: "rounded-lg bg-muted/50",
    glass: "glass rounded-xl",
    card: "glass rounded-2xl h-64",
    text: "h-4 rounded bg-muted/50",
    avatar: "h-10 w-10 rounded-full bg-muted/50",
    button: "h-9 w-24 rounded-xl bg-muted/50",
  }

  return (
    <div
      className={cn(baseClass, variants[variant], className)}
      aria-hidden="true"
    />
  )
}

/** Trip card skeleton — matches TripCard dimensions. */
export function TripCardSkeleton() {
  return (
    <div className="glass rounded-2xl overflow-hidden" aria-hidden="true">
      <div className="relative h-56 sm:h-64">
        <Skeleton className="h-full w-full rounded-none" />
        <div className="absolute right-3 top-3">
          <Skeleton className="h-6 w-16 rounded-full" variant="glass" />
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-3">
        <Skeleton variant="text" className="w-40" />
        <Skeleton variant="text" className="w-12" />
      </div>
    </div>
  )
}

/** List skeleton — multiple cards. */
export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <TripCardSkeleton key={i} />
      ))}
    </div>
  )
}

/** Stats section skeleton. */
export function StatsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="card" className="h-24" />
      ))}
    </div>
  )
}
