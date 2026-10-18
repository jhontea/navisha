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
          "top-auto bottom-0 left-0 max-h-[90dvh] max-w-full translate-x-0 translate-y-0 overflow-y-auto rounded-t-3xl rounded-b-none p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-overlay",
          // sm and up: centered dialog.
          "sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[85vh] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:p-7",
          // Enter/exit: slide up from the bottom on phones, fade and scale from
          // `sm` up. Base UI sets data-starting-style / data-ending-style.
          "transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none",
          "data-starting-style:translate-y-full data-ending-style:translate-y-full",
          "sm:data-starting-style:-translate-y-1/2 sm:data-ending-style:-translate-y-1/2 sm:data-starting-style:scale-95 sm:data-ending-style:scale-95 sm:data-starting-style:opacity-0 sm:data-ending-style:opacity-0",
          className ?? "",
        ].join(" ")}
      >
        <DialogHeader className="pr-10">
          <DialogTitle className="font-display text-xl font-extrabold">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
