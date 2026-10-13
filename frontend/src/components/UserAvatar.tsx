"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface Props {
  src?: string | null
  name?: string | null
  /** Size + ring/border classes, e.g. "h-7 w-7". */
  className?: string
  /** Initial-letter text size for the fallback, e.g. "text-xs". */
  textClassName?: string
  /** True when a visible label already names the user (alt="" + aria-hidden). */
  decorative?: boolean
}

/**
 * Google profile photo with an initial-letter fallback.
 *
 * Google avatar URLs (lh3.googleusercontent.com) often reject requests that
 * carry our site as referrer, so the image is loaded with no-referrer. If it
 * still fails, or there is no photo, the user's initial is shown instead of
 * broken-image alt text.
 */
export function UserAvatar({ src, name, className, textClassName = "text-xs", decorative = false }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const initial = name?.trim().charAt(0).toUpperCase() || "?"

  if (src && failedSrc !== src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        // The image can fail before hydration, when React's onError is not
        // attached yet; catch that case when the element mounts.
        ref={(img) => {
          if (img && img.complete && img.naturalWidth === 0) setFailedSrc(src)
        }}
        src={src}
        alt={decorative ? "" : (name ?? "User avatar")}
        aria-hidden={decorative || undefined}
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(src)}
        className={cn("rounded-full object-cover", className)}
      />
    )
  }

  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : `Avatar for ${name ?? "user"}`}
      aria-hidden={decorative || undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground",
        textClassName,
        className,
      )}
    >
      {initial}
    </span>
  )
}
