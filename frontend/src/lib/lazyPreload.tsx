"use client"

import dynamic from "next/dynamic"
import { useState, type ComponentType, type ReactNode } from "react"

import { loadOrOffline } from "./loadOrOffline"

/**
 * next/dynamic for a form in a sheet, plus a `preload()` that lets it skip the
 * fallback. React.lazy suspends on its first render even when the chunk is
 * already here, and React then holds the fallback for about 300ms, so a preload
 * alone still makes the sheet jump. Once loaded, the component renders directly.
 */
export function lazyPreload<P extends object>(load: () => Promise<ComponentType<P>>, loading: () => ReactNode) {
  let loaded: ComponentType<P> | null = null
  const preload = () => load().then((C) => (loaded = C))
  const Dynamic = dynamic(() => loadOrOffline(preload), { ssr: false, loading })

  function LazyPreload(props: P) {
    // Picked once per mount: switching while open would remount the form and lose what was typed.
    const [C] = useState(() => loaded ?? Dynamic)
    return <C {...props} />
  }
  LazyPreload.preload = preload
  return LazyPreload
}
