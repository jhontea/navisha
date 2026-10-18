"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"

export function MobileMenu() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        className="flex h-11 w-11 items-center justify-center rounded-full text-foreground hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Menu className="h-5 w-5" aria-hidden="true" />
        )}
      </button>

      {open && <div
        id="mobile-menu"
        role="menu"
        className="absolute left-0 right-0 top-16 z-50 sm:hidden"
      >
        <div className="mx-3 flex flex-col gap-1 rounded-2xl border bg-popover p-2 shadow-overlay">
          <a
            href="#features"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-foreground hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-foreground hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            How it works
          </a>
          <Link
            href="/login"
            prefetch={false}
            role="menuitem"
            onClick={() => setOpen(false)}
            className={buttonVariants({ className: "mt-1 w-full" })}
          >
            Sign in
          </Link>
        </div>
      </div>}
    </>
  )
}
