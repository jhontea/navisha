import type { CSSProperties } from "react"

// AI result reveal (P3 A): fade + rise 8px, 250ms ease-soft, 50ms stagger capped at 8 items.
// Sets transform while running (and during the delay, via fill-mode-backwards), so never put it
// on an element that is or contains fixed/sticky — use animate-fade-only there.
// animation-duration-250, not duration-250: the latter also sets transition-duration (C8).
export const REVEAL_CLASS =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-backwards animation-duration-250 ease-soft"

export const revealDelay = (i: number): CSSProperties => ({ animationDelay: `${Math.min(i, 7) * 50}ms` })
