"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface TopBarProps {
  title?: string
  backHref?: string
  rightAction?: React.ReactNode
  className?: string
}

/** Universal sticky top bar with back button + context title for sub-pages. */
export function TopBar({ title, backHref, rightAction, className }: TopBarProps) {
  const router = useRouter()

  const handleBack = () => {
    if (backHref) {
      router.push(backHref)
    } else {
      router.back()
    }
  }

  return (
    <div
      className={cn(
        "sticky top-0 z-40 flex items-center gap-3 px-4 py-3 md:top-14 md:px-10",
        className,
      )}
    >
      <button
        type="button"
        onClick={handleBack}
        className="glass flex h-9 w-9 items-center justify-center rounded-xl text-foreground transition-all hover:bg-white/25 active:scale-95"
        aria-label="Go back"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {title && (
        <h1 className="text-lg font-semibold text-foreground truncate">{title}</h1>
      )}

      <div className="flex-1" />

      {rightAction}
    </div>
  )
}
