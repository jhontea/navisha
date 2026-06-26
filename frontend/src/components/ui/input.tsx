import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input"> & { variant?: "default" | "glass" }>(
  ({ className, type, variant = "default", ...props }, ref) => {
    const glassStyle = variant === "glass"
      ? "bg-white/10 backdrop-blur-sm border-white/20 focus-visible:border-chromatic-sky focus-visible:ring-chromatic-sky/30 placeholder:text-foreground/40 dark:bg-white/5 dark:border-white/10"
      : "bg-transparent border-input focus-visible:border-ring focus-visible:ring-ring/50"
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          "flex h-9 w-full min-w-0 rounded-lg border px-3 py-1 text-sm transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          "focus-visible:ring-2",
          glassStyle,
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = "Input"

export { Input }
