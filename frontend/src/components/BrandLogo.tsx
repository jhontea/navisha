import { Compass } from "lucide-react"

import { cn } from "@/lib/utils"

/** Navisha logomark + wordmark (docs/DESIGN.md §8). Wrap in a Link where it navigates. */
export function BrandLogo({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary">
        <Compass className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
      </span>
      <span className={cn("font-display text-xl font-black tracking-tight", onDark ? "text-on-cover" : "text-foreground")}>
        Navisha
      </span>
    </span>
  )
}
