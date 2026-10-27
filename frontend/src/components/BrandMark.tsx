import { useId } from "react"

import { cn } from "@/lib/utils"

/**
 * Navisha logomark: an N stroke, a blue sail and an amber sparkle (source:
 * notes design board, redrawn as vector). The N takes the text colour, so it
 * follows the theme (dark ink on light, light ink on dark or on a cover).
 */
// ds-allow-hardcode: brand artwork colours (sail blue, sparkle amber) are part of the logo, not UI tokens.
export function BrandMark({ className }: { className?: string }) {
  const sail = useId()
  return (
    <svg viewBox="140 10 625 590" className={cn("h-9 w-auto shrink-0", className)} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={sail} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#6FA3D2" /> {/* ds-allow-hardcode: logo artwork */}
          <stop offset="1" stopColor="#4A80B4" /> {/* ds-allow-hardcode: logo artwork */}
        </linearGradient>
      </defs>
      <path
        fill="currentColor"
        d="M155 200 L155 115 C155 55 205 18 285 18 C355 18 395 48 432 92 L738 418 C750 432 755 448 755 468 L755 555 C755 578 740 590 718 590 L692 590 C645 590 607 566 576 528 L338 244 C298 200 248 186 196 190 C178 192 165 195 155 200 Z"
      />
      <path
        fill={`url(#${sail})`}
        d="M155 285 C155 258 172 244 204 244 C262 246 302 272 342 322 L446 436 C405 424 364 430 326 462 L214 562 C192 581 155 574 155 540 Z"
      />
      <path
        fill="#F2A33A" // ds-allow-hardcode: logo artwork
        d="M660 18 C668 84 690 106 746 118 C690 130 668 152 660 216 C652 152 630 130 574 118 C630 106 652 84 660 18 Z"
      />
    </svg>
  )
}
