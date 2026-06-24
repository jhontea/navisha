"use client"

interface ShimmerOverlayProps {
  children: React.ReactNode
  active: boolean
  className?: string
}

export function ShimmerOverlay({ children, active, className = "" }: ShimmerOverlayProps) {
  if (!active) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {children}
      {/* Shimmer overlay */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
        <div className="absolute inset-0 animate-pulse bg-primary/5" />
      </div>
    </div>
  )
}
