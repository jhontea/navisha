import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
  variant?: "default" | "text" | "avatar" | "button" | "circle"
}

const variants: Record<NonNullable<SkeletonProps["variant"]>, string> = {
  default: "rounded-lg",
  text: "h-4 rounded",
  avatar: "h-10 w-10 rounded-full",
  button: "h-9 w-24 rounded-xl",
  circle: "rounded-full",
}

/** Pulsing placeholder block while content loads; same look as the hand-written `animate-pulse bg-skeleton` blocks. */
export function Skeleton({ className, variant = "default" }: SkeletonProps) {
  return <div className={cn("animate-pulse bg-skeleton", variants[variant], className)} aria-hidden="true" />
}
