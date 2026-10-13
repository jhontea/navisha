"use client"

import { GeneratingIndicator } from "@/components/GeneratingIndicator"

const MESSAGES = [
  "Reading your preferences…",
  "Finding places that fit…",
  "Laying out each day…",
  "Balancing time and distance…",
  "Adding local tips…",
  "Almost done…",
]

interface Props {
  days?: number
}

export function GeneratingItinerarySkeleton({ days: _days }: Props) {
  return (
    <div className="flex h-full min-h-[260px] items-center justify-center" aria-live="polite" aria-busy="true">
      <GeneratingIndicator
        messages={MESSAGES}
        helperText="Ini bisa memakan waktu beberapa menit, santai sebentar ya."
      />
    </div>
  )
}
