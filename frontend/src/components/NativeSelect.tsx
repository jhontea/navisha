import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Native <select> with the app's field styling. Native keeps React Hook Form
 * (register / Controller), mobile pickers and keyboard behavior for free; use
 * the coss Select only where a custom popup is needed. Height is a minimum,
 * so extra padding from a caller grows the field instead of clipping the text.
 */
export const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  function NativeSelect({ className, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          "min-h-11 w-full rounded-xl border bg-card px-4 py-2 text-base text-foreground transition-colors focus-visible:border-ring focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:min-h-10",
          className,
        )}
        {...props}
      />
    )
  },
)
