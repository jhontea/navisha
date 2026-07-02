"use client"
import { useEffect, useState } from "react"

/**
 * Reads body.dataset.slideDir on mount (set by TripTabBar before navigation),
 * clears it, returns the matching animation class.
 */
export function useSlideDirection(): string {
  const [cls, setCls] = useState("")
  useEffect(() => {
    const dir = document.body.dataset.slideDir
    if (dir) {
      delete document.body.dataset.slideDir
      setCls(dir === "right" ? "animate-slide-from-right" : "animate-slide-from-left")
    }
  }, [])
  return cls
}
