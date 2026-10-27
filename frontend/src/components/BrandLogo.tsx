import { BrandMark } from "@/components/BrandMark"
import { cn } from "@/lib/utils"

/** Navisha logomark + wordmark (docs/DESIGN.md §8). Wrap in a Link where it navigates. */
export function BrandLogo({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <BrandMark className={onDark ? "text-on-cover" : "text-foreground"} />
      <span className={cn("font-display text-xl font-black tracking-tight", onDark ? "text-on-cover" : "text-foreground")}>
        Navisha
      </span>
    </span>
  )
}
