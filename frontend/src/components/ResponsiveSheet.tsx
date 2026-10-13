"use client"

import type { ReactNode } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * One container for forms and detail panels: a bottom sheet on phones and a
 * centered dialog from `sm` up. Built on the base-ui Dialog, so focus
 * trapping, Escape and outside-click closing come for free.
 */
export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={[
          // Phone: full-width sheet anchored to the bottom.
          "top-auto bottom-0 left-0 max-h-[90dvh] max-w-full translate-x-0 translate-y-0 overflow-y-auto rounded-t-2xl rounded-b-none p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-overlay",
          // sm and up: centered dialog.
          "sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[85vh] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:p-6",
          className ?? "",
        ].join(" ")}
      >
        <DialogHeader className="pr-10">
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
