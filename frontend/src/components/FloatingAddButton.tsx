"use client"

import type { ComponentType } from "react"
import { Plus } from "lucide-react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useOnline } from "@/lib/useOnline"

type Action = { label: string; icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>; onSelect: () => void }

// Phones only, bottom right, just above the floating tab bar (FloatingNav: h-16
// at bottom max(0.75rem, safe area)).
const POSITION =
  "fixed right-4 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4.75rem)] z-40 md:hidden"
const BUTTON =
  "flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-overlay transition-transform active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 motion-reduce:transition-none"
const MENU_ITEM = "min-h-11 gap-3 px-3 text-sm font-semibold"

/**
 * The page's main "add" action as a floating button on phones, so it is in reach
 * without scrolling. One action opens it directly; several open a small menu.
 * Disabled offline, where writes are refused anyway.
 */
export function FloatingAddButton({ label, onClick, actions }: { label: string; onClick?: () => void; actions?: Action[] }) {
  const online = useOnline()

  if (!actions) {
    return (
      <div className={POSITION}>
        <button type="button" aria-label={label} title={label} onClick={onClick} disabled={!online} className={BUTTON}>
          <Plus className="size-6" aria-hidden="true" />
        </button>
      </div>
    )
  }

  return (
    <div className={POSITION}>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={label} title={label} disabled={!online} className={BUTTON}>
          <Plus className="size-6" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" sideOffset={10} className="w-56">
          {actions.map(({ label: itemLabel, icon: Icon, onSelect }) => (
            <DropdownMenuItem key={itemLabel} className={MENU_ITEM} onClick={onSelect}>
              <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
              {itemLabel}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/** Keeps the last card clear of the floating button on phones. */
export function FloatingAddSpacer() {
  return <div className="h-16 md:hidden" aria-hidden="true" />
}
