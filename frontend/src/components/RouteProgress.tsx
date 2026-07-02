"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
}

function isSameOriginInternalLink(anchor: HTMLAnchorElement) {
  if (!anchor.href || anchor.target === "_blank" || anchor.hasAttribute("download")) return false
  const url = new URL(anchor.href)
  return url.origin === window.location.origin
}

export function RouteProgress() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [settling, setSettling] = useState(false)
  const timeoutRef = useRef<number | null>(null)
  const prevPathnameRef = useRef(pathname)

  useEffect(() => {
    function clearTimer() {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }

    function onClick(event: MouseEvent) {
      if (isModifiedClick(event)) return
      const target = event.target as Element | null
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null
      if (!anchor || !isSameOriginInternalLink(anchor)) return

      const url = new URL(anchor.href)
      if (url.pathname === window.location.pathname && url.search === window.location.search) return

      clearTimer()
      setSettling(false)
      setVisible(true)
    }

    document.addEventListener("click", onClick, true)
    return () => {
      document.removeEventListener("click", onClick, true)
      clearTimer()
    }
  }, [])

  useEffect(() => {
    if (prevPathnameRef.current === pathname) return
    prevPathnameRef.current = pathname
    if (!visible) return
    setSettling(true)
    timeoutRef.current = window.setTimeout(() => {
      setVisible(false)
      setSettling(false)
    }, 350)
  }, [pathname, visible])

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[1000] h-0.5 overflow-hidden bg-transparent">
      <div
        className={`h-full bg-gradient-to-r from-primary via-chromatic-aurora to-chromatic-ocean shadow-[0_0_12px_hsl(var(--primary)/0.45)] ${
          settling ? "w-full duration-300 ease-out" : "w-2/3 duration-[900ms] ease-out"
        } transition-[width]`}
      />
    </div>
  )
}
