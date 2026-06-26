"use client"

import { cn } from "@/lib/utils"

interface ProgressProps {
  value: number // 0-100
  max?: number
  size?: "sm" | "default" | "lg"
  variant?: "default" | "gradient" | "glass"
  label?: string
  showValue?: boolean
  className?: string
}

export function Progress({
  value,
  max = 100,
  size = "default",
  variant = "gradient",
  label,
  showValue = false,
  className,
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  const sizeStyles = {
    sm: "h-1.5",
    default: "h-2.5",
    lg: "h-4",
  }

  const variantStyles = {
    default: "bg-primary",
    gradient: "bg-gradient-to-r from-chromatic-sunset via-chromatic-aurora to-chromatic-sky bg-[length:200%_200%]",
    glass: "bg-white/30 backdrop-blur-sm",
  }

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-1 flex items-center justify-between text-xs">
          {label && <span className="font-medium text-foreground">{label}</span>}
          {showValue && (
            <span className="tabular-nums font-semibold text-muted-foreground">
              {Math.round(pct)}%
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={cn(
          "w-full overflow-hidden rounded-full bg-muted/50",
          sizeStyles[size],
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            variantStyles[variant],
            variant === "gradient" && "animate-gradient-shift bg-[length:200%_200%]",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
