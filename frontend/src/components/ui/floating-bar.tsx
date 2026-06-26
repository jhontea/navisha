"use client"

import { cn } from "@/lib/utils"

interface FloatingBarProps {
  children: React.ReactNode
  position?: "bottom" | "top"
  className?: string
  show?: boolean
}

export function FloatingBar({
  children,
  position = "bottom",
  className,
  show = true,
}: FloatingBarProps) {
  if (!show) return null

  return (
    <div
      className={cn(
        "fixed inset-x-0 z-[var(--z-sticky)] mx-auto max-w-max-width px-margin-mobile md:px-margin-desktop",
        position === "bottom" ? "bottom-20 md:bottom-6" : "top-16 md:top-4",
        className,
      )}
    >
      <div className="glass-lg rounded-2xl px-4 py-3 flex items-center gap-4 animate-fade-up">
        {children}
      </div>
    </div>
  )
}
