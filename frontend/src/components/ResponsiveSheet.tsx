"use client"

import { useRef, useState, type ReactNode } from "react"

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
  // Callers usually clear their state when closing (title flips to "Add", children
  // become null), so keep showing the last open content until the exit animation
  // ends. Adjusted during render, like RouteProgress.
  const [held, setHeld] = useState<{ title: string; description?: string; children: ReactNode } | null>(null)
  if (open && (held?.title !== title || held.description !== description || held.children !== children)) {
    setHeld({ title, description, children })
  }
  const shown = !open && held ? held : { title, description, children }
  const popupRef = useRef<HTMLDivElement>(null)

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) setHeld(null)
      }}
    >
      <DialogContent
        ref={popupRef}
        // Base UI only spares the first input on a touch-opened trigger, and these sheets are
        // controlled, so on touch focus the popup or the phone keyboard pops up on open.
        initialFocus={() => (window.matchMedia("(pointer: coarse)").matches ? popupRef.current : true)}
        className={[
          // Phone: full-width sheet anchored to the bottom. The grid track may
          // shrink (minmax(0,1fr)) so a wide child, e.g. an iOS date/time input,
          // cannot widen the sheet and make it scroll sideways.
          "top-auto bottom-0 left-0 max-h-[90dvh] max-w-full grid-cols-[minmax(0,1fr)] translate-x-0 translate-y-0 overflow-x-hidden overflow-y-auto rounded-t-3xl rounded-b-none p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-overlay",
          // sm and up: centered dialog.
          "sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[85vh] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:p-7",
          // Enter/exit: on phones the sheet slides up (translate transition) under coss's
          // fade, with coss's zoom off and its exit fade off (a fading panel reads as
          // dissolving, not sliding down); from `sm` up coss's fade + zoom alone. No
          // opacity-0 on data-ending-style: coss's exit keyframe would start from it and
          // the dialog would vanish in one frame. Base UI sets data-starting/ending-style.
          "transition-[translate] duration-250 ease-soft motion-reduce:transition-none",
          "data-starting-style:translate-y-full data-ending-style:translate-y-full max-sm:data-open:zoom-in-[1] max-sm:data-closed:zoom-out-[1] max-sm:data-closed:fade-out-100",
          "sm:data-starting-style:-translate-y-1/2 sm:data-ending-style:-translate-y-1/2",
          className ?? "",
        ].join(" ")}
      >
        <DialogHeader className="pr-10">
          <DialogTitle className="font-display text-xl font-extrabold">{shown.title}</DialogTitle>
          {shown.description && <DialogDescription>{shown.description}</DialogDescription>}
        </DialogHeader>
        {shown.children}
      </DialogContent>
    </Dialog>
  )
}
