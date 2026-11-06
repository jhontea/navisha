"use client"

import { useEffect, useState } from "react"
import { AutogenIllustration } from "@/components/illustrations/AutogenIllustration"

import { formatElapsed } from "../lib/generateJob"

interface Props {
  /** When the job started (ISO). Counts from now when not known yet. */
  startedAt?: string
}

/** Honest progress: the real time since the job started, not rotating filler. */
export function GeneratingItinerarySkeleton({ startedAt }: Props) {
  const [mountedAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const parsed = startedAt ? Date.parse(startedAt) : Number.NaN
  const origin = Number.isFinite(parsed) ? parsed : mountedAt

  return (
    <div className="flex h-full min-h-[260px] items-start justify-center" aria-busy="true">
      {/* Sticky: the wizard under the overlay is tall, keep the progress in view. */}
      <div className="sticky top-32 flex flex-col items-center gap-3 py-4 text-center">
        <AutogenIllustration className="size-40 md:size-50 [@media(max-height:600px)]:size-28" />
        <div className="h-1 w-50 overflow-hidden rounded-full bg-muted motion-reduce:hidden" aria-hidden="true">
          <div className="autogen-bar h-full w-2/5 rounded-full bg-primary" />
        </div>
        <p className="text-sm font-medium text-foreground">
          Generating your itinerary… <span className="tabular-nums">{formatElapsed(now - origin)}</span>
        </p>
        <p className="max-w-xs text-xs text-muted-foreground">
          This usually takes 1-3 minutes. You can leave this page and come back, it keeps going.
        </p>
      </div>
    </div>
  )
}
