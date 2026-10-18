"use client"

import { useEffect, useState } from "react"
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
  const [prevPathname, setPrevPathname] = useState(pathname)

  // The route changed: let a visible bar run to full width, then hide it.
  // Adjusted during render (not in an effect) so it lands in the same commit.
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    if (visible) setSettling(true)
  }

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (isModifiedClick(event)) return
      const target = event.target as Element | null
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null
      if (!anchor || !isSameOriginInternalLink(anchor)) return

      const url = new URL(anchor.href)
      if (url.pathname === window.location.pathname && url.search === window.location.search) return

      // Leaving `settling` cancels a pending hide (see the effect below).
      setSettling(false)
      setVisible(true)
    }

    document.addEventListener("click", onClick, true)
    return () => document.removeEventListener("click", onClick, true)
  }, [])

  useEffect(() => {
    if (!settling) return
    const timeout = window.setTimeout(() => {
      setVisible(false)
      setSettling(false)
    }, 350)
    return () => window.clearTimeout(timeout)
  }, [settling])

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-1000 h-0.5 overflow-hidden bg-transparent">
      <div
        className={`h-full bg-primary ${
          settling ? "w-full duration-300 ease-out" : "w-2/3 duration-900 ease-out"
        } transition-[width]`}
      />
    </div>
  )
}
