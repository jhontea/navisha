"use client"

import { useEffect, useState } from "react"
import { Loader2, Sparkles } from "lucide-react"

const DEFAULT_MESSAGES = [
  "Reading your itinerary...",
  "Reviewing stays and transport...",
  "Checking dates and timings...",
  "Analyzing destinations...",
  "Spotting highlights of your trip...",
  "Finding interesting patterns...",
  "Connecting the dots...",
  "Calculating travel pace...",
  "Crunching the budget...",
  "Looking for trip insights...",
  "Organizing key information...",
  "Summarizing the essentials...",
  "Preparing recommendations...",
  "Polishing the wording...",
  "Adding the finishing touches...",
  "Almost there...",
]

const DEFAULT_ROTATE_INTERVAL_MS = 5000

interface GeneratingIndicatorProps {
  // When true, renders a compact inline variant, for example during regenerate.
  compact?: boolean
  helperText?: string
  messages?: string[]
  rotateIntervalMs?: number
}

export function GeneratingIndicator({
  compact = false,
  helperText = "This can take a little while - hang tight.",
  messages = DEFAULT_MESSAGES,
  rotateIntervalMs = DEFAULT_ROTATE_INTERVAL_MS,
}: GeneratingIndicatorProps) {
  const [index, setIndex] = useState(0)
  const rotatingMessages = messages.length > 0 ? messages : DEFAULT_MESSAGES

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % rotatingMessages.length)
    }, rotateIntervalMs)
    return () => clearInterval(id)
  }, [rotatingMessages.length, rotateIntervalMs])

  const message = rotatingMessages[index % rotatingMessages.length]

  if (compact) {
    return (
      <span
        className="inline-flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground sm:text-xs"
        aria-live="polite"
      >
        <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin" />
        <span key={message} className="animate-in fade-in truncate duration-500">
          {message}
        </span>
      </span>
    )
  }

  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-4 text-center"
      aria-live="polite"
      aria-busy="true"
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
      <p className="text-xs text-muted-foreground">{helperText}</p>
    </div>
  )
}
