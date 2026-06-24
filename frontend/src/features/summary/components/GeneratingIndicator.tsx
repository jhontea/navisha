"use client"

import { useEffect, useState } from "react"
import { Loader2, Sparkles } from "lucide-react"

// Messages shown one-at-a-time while the AI summary is being generated.
// They rotate on a fixed interval to reassure the user that work is in
// progress during what can be a long (10-30s+) request.
const GENERATING_MESSAGES = [
  "Reading your itinerary…",
  "Reviewing stays and transport…",
  "Checking dates and timings…",
  "Analyzing destinations…",
  "Spotting highlights of your trip…",
  "Finding interesting patterns…",
  "Connecting the dots…",
  "Calculating travel pace…",
  "Crunching the budget…",
  "Looking for trip insights…",
  "Organizing key information…",
  "Summarizing the essentials…",
  "Preparing recommendations…",
  "Polishing the wording…",
  "Adding the finishing touches…",
  "Almost there…",
];

const ROTATE_INTERVAL_MS = 5000

interface GeneratingIndicatorProps {
  // When true, renders a compact inline variant (e.g. for the regenerate state).
  compact?: boolean
}

export function GeneratingIndicator({ compact = false }: GeneratingIndicatorProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % GENERATING_MESSAGES.length)
    }, ROTATE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  const message = GENERATING_MESSAGES[index]

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-muted-foreground"
        aria-live="polite"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span key={message} className="animate-in fade-in duration-500">
          {message}
        </span>
      </span>
    )
  }

  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-4"
      aria-live="polite"
    >
      <div className="relative flex h-12 w-12 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-6 w-6 animate-pulse text-primary" />
        </span>
      </div>
      <p
        key={message}
        className="animate-in fade-in slide-in-from-bottom-1 text-sm font-medium text-foreground duration-500"
      >
        {message}
      </p>
      <p className="text-xs text-muted-foreground">
        This can take a little while — hang tight.
      </p>
    </div>
  )
}
