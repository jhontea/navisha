import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Native <select> with the app's field styling. Native keeps React Hook Form
 * (register / Controller), mobile pickers and keyboard behavior for free; use
 * the coss Select only where a custom popup is needed.
 */
export const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  function NativeSelect({ className, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          "h-11 w-full rounded-lg border bg-background px-3 text-sm text-foreground transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:h-10",
          className,
        )}
        {...props}
      />
    )
  },
)
