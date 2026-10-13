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

/**
 * Shell for a transport or stay card on the Bookings page: tinted round
 * icon, content, and a ⋯ menu with Edit / Delete.
 */
export function BookingCard({
  icon: Icon,
  iconClassName,
  title,
  subtitle,
  actionsLabel,
  onEdit,
  onDelete,
  isDeleting,
  children,
}: {
  icon: ComponentType<{ className?: string }>
  /** Background + text tint, e.g. "bg-cat-transport/15 text-cat-transport". */
  iconClassName: string
  title: ReactNode
  subtitle?: ReactNode
  actionsLabel: string
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
  children?: ReactNode
}) {
  return (
    <article className="flex gap-3 rounded-xl border bg-card px-4 py-3">
      <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", iconClassName)}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold leading-snug text-foreground">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={actionsLabel}
              className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "-mr-2 -mt-1 shrink-0 text-muted-foreground" })}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem className={MENU_ITEM} onClick={onEdit}>
                <Pencil aria-hidden="true" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className={MENU_ITEM} variant="destructive" disabled={isDeleting} onClick={onDelete}>
                <Trash2 aria-hidden="true" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {children}
      </div>
    </article>
  )
}
