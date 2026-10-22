import { MapPin } from "lucide-react"

import { cn } from "@/lib/utils"

/** Destination name on the gradient cover, so a trip with no matching illustration is not an empty block. */
export function CoverDestination({ destination, className }: { destination?: string | null; className?: string }) {
  if (!destination) return null
  return (
    <p
      className={cn(
        "pointer-events-none absolute flex max-w-[calc(100%-2rem)] items-start gap-1.5 text-sm font-extrabold text-on-cover/90",
        className,
      )}
    >
      <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="line-clamp-2 text-center">{destination}</span>
    </p>
  )
}
