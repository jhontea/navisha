import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
  variant?: "default" | "text" | "avatar" | "button" | "circle"
}

/** Placeholder block with a shimmer while content loads. */
export function Skeleton({ className, variant = "default" }: SkeletonProps) {
  const baseClass = "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-linear-to-r before:from-transparent before:via-white/30 before:to-transparent"

  const variants: Record<string, string> = {
    default: "rounded-lg bg-muted/50",
    text: "h-4 rounded bg-muted/50",
    avatar: "h-10 w-10 rounded-full bg-muted/50",
    button: "h-9 w-24 rounded-xl bg-muted/50",
    circle: "rounded-full bg-muted/50",
  }

  return (
    <div
      className={cn(baseClass, variants[variant], className)}
      aria-hidden="true"
    />
  )
}
