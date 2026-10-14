"use client"

import type { ComponentType, ReactNode } from "react"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const MENU_ITEM = "min-h-10 px-3 text-sm"

/** ⋯ menu with Edit / Delete for a booking (transport pass, stay card). */
export function BookingActions({
  label,
  onEdit,
  onDelete,
  className,
}: {
  label: string
  onEdit: () => void
  onDelete: () => void
  className?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className={buttonVariants({ variant: "ghost", size: "icon-sm", className: cn("shrink-0 text-muted-foreground", className) })}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem className={MENU_ITEM} onClick={onEdit}>
          <Pencil aria-hidden="true" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem className={MENU_ITEM} variant="destructive" onClick={onDelete}>
          <Trash2 aria-hidden="true" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Shell for a booking card on the Bookings page (docs/DESIGN.md §5): soft
 * icon circle, Nunito title, an optional chip, the ⋯ menu, then content.
 */
export function BookingCard({
  icon: Icon,
  title,
  subtitle,
  badge,
  actionsLabel,
  onEdit,
  onDelete,
  children,
}: {
  icon: ComponentType<{ className?: string }>
  title: ReactNode
  subtitle?: ReactNode
  /** Small chip next to the title, e.g. the stay type. */
  badge?: ReactNode
  actionsLabel: string
  onEdit: () => void
  onDelete: () => void
  children?: ReactNode
}) {
  return (
    <article className="rounded-2xl border bg-card p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-display text-lg font-extrabold leading-snug text-foreground">{title}</h3>
            {badge}
          </div>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <BookingActions label={actionsLabel} onEdit={onEdit} onDelete={onDelete} className="-mr-1.5 -mt-1" />
      </div>
      {children}
    </article>
  )
}
