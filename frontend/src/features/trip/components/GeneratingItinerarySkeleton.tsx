"use client"

import { useEffect, useState } from "react"
import { Sparkles } from "lucide-react"

const MESSAGES = [
  "Memahami preferensi perjalananmu…",
  "Mencari aktivitas terbaik…",
  "Menyusun itinerary harian…",
  "Menyeimbangkan waktu dan lokasi…",
  "Menambahkan tips perjalanan…",
  "Hampir selesai…",
]
const ROTATE_MS = 4000

function ShimmerBar({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-md bg-surface-container-high ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  )
}

interface Props { days?: number }

export function GeneratingItinerarySkeleton({ days: _days }: Props) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setIndex((prev) => (prev + 1) % MESSAGES.length), ROTATE_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="space-y-5" aria-live="polite" aria-busy="true">
      {/* Centered spark + rotating message — matching summary generating style */}
      <div className="flex flex-col items-center justify-center gap-3 py-2 text-center">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-7 w-7 animate-pulse text-primary" />
          </span>
        </div>
        {MESSAGES.map((msg, i) => (
          <p
            key={msg}
            className={`font-label-md text-label-md text-on-surface transition-all duration-500 ${
              i === index ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 absolute"
            }`}
            aria-hidden={i !== index}
          >
            {msg}
          </p>
        ))}
        <p className="text-body-sm text-on-surface-variant">
          Ini bisa memakan waktu beberapa menit, santai aja ☕
        </p>
      </div>

      <div className="rounded-xl border border-surface-container-high bg-white p-5">
        <div className="mb-4 flex items-center gap-3">
          <ShimmerBar className="h-8 w-8 rounded-full" />
          <ShimmerBar className="h-4 w-1/3" />
        </div>
        <div className="space-y-3 pl-11">
          <ShimmerBar className="h-3 w-full" />
          <ShimmerBar className="h-3 w-4/5" />
          <ShimmerBar className="h-3 w-3/5" />
          <ShimmerBar className="h-3 w-2/3" />
        </div>
      </div>

      <div className="rounded-xl border border-surface-container-high bg-white p-5">
        <div className="mb-4 flex items-center gap-3">
          <ShimmerBar className="h-8 w-8 rounded-full" />
          <ShimmerBar className="h-4 w-1/4" />
        </div>
        <div className="space-y-3 pl-11">
          <ShimmerBar className="h-3 w-full" />
          <ShimmerBar className="h-3 w-3/4" />
          <ShimmerBar className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  )
}
