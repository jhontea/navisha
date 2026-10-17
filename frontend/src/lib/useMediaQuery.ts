"use client"

import { useEffect, useState, useSyncExternalStore } from "react"

/** Tailwind's `lg` breakpoint (default theme), for components that must not even mount below it. */
export const LG_MEDIA_QUERY = "(min-width: 1024px)"

/**
 * Whether `query` matches, kept in sync on resize. False on the server and
 * during hydration. Use it instead of a CSS `hidden` class when the hidden
 * part is expensive to mount (a Google map is billed per load even when
 * `display: none`).
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener("change", onChange)
      return () => list.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/**
 * True from the first render where `condition` held, and from then on. Keeps
 * an expensive child (a map) mounted once shown, instead of unmounting it
 * while there is briefly nothing to show and paying for a new one after.
 */
export function useOnceTrue(condition: boolean): boolean {
  const [seen, setSeen] = useState(condition)
  useEffect(() => {
    if (condition) setSeen(true)
  }, [condition])
  return seen || condition
}
