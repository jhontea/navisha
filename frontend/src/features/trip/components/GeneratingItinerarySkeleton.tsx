"use client"

import { useEffect, useState } from "react"
import { Sparkles } from "lucide-react"

// Rotating status lines shown while the AI builds the itinerary. Generating a
// full multi-day trip can take 1-2 minutes, so we reassure the user with
// progress-y copy that cycles on a fixed interval.
const MESSAGES = [
  "Memahami preferensi perjalananmu…",
  "Memilih destinasi terbaik…",
  "Menyusun aktivitas harian…",
  "Menyeimbangkan tempo perjalanan…",
  "Memperkirakan waktu kunjungan…",
  "Menata urutan lokasi…",
  "Menambahkan sentuhan akhir…",
  "Hampir selesai…",
]

const ROTATE_MS = 4000

// A shimmering skeleton that mimics the shape of the generated itinerary
// (a few "day" cards each with activity rows). The sweeping highlight uses the
// `shimmer` keyframe defined in tailwind.config.ts.
function ShimmerBar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-surface-container-high ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  )
}

function DaySkeleton({ day }: { day: number }) {
  // Vary the number of activity rows so the skeleton doesn't look too uniform.
  const rows = 2 + (day % 3)
  return (
    <div className="rounded-xl border border-surface-container-high bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-label-sm font-semibold text-primary">
          {day}
        </div>
        <ShimmerBar className="h-4 w-28" />
      </div>
      <div className="space-y-2.5 pl-9">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <ShimmerBar className="h-3 w-12 shrink-0" />
            <ShimmerBar className={`h-3 ${i % 2 === 0 ? "w-2/3" : "w-1/2"}`} />
          </div>
        ))}
      </div>
    </div>
  )
}

interface Props {
  // How many day skeletons to render. Defaults to 4.
  days?: number
}

export function GeneratingItinerarySkeleton({ days = 4 }: Props) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % MESSAGES.length)
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [])

  const message = MESSAGES[index]

  return (
    <div className="space-y-5" aria-live="polite" aria-busy="true">
      {/* Header: animated sparkle + rotating status */}
      <div className="flex flex-col items-center justify-center gap-3 py-2 text-center">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-7 w-7 animate-pulse text-primary" />
          </span>
        </div>
        <p
          key={message}
          className="animate-in fade-in slide-in-from-bottom-1 font-label-md text-label-md text-on-surface duration-500"
        >
          {message}
        </p>
        <p className="text-body-sm text-on-surface-variant">
          AI sedang menyusun itinerary — ini bisa memakan waktu beberapa menit.
        </p>
      </div>

      {/* Skeleton day cards */}
      <div className="space-y-3">
        {Array.from({ length: days }).map((_, i) => (
          <DaySkeleton key={i} day={i + 1} />
        ))}
      </div>
    </div>
  )
}
