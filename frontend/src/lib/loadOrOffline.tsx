"use client"

import { useEffect, useState, type ComponentType } from "react"

import { useOnline } from "./useOnline"

/**
 * Loader wrapper for next/dynamic forms and sheets. Offline, a chunk that was
 * never downloaded fails to load; render a short note in its place instead of
 * throwing to the page's error boundary. next/dynamic keeps whatever the loader
 * returned, so the note itself retries the import once the connection is back.
 */
export function loadOrOffline<P extends object>(load: () => Promise<ComponentType<P>>): Promise<ComponentType<P>> {
  // Kept across mounts, so a sheet reopened offline after one retry worked shows the form.
  let retried: ComponentType<P> | null = null
  return load().catch((err) => {
    // Online (e.g. a deploy removed an old chunk): keep the page error boundary's "Reload".
    if (navigator.onLine) throw err
    return function NeedsConnection(props: P) {
      const online = useOnline()
      const [Loaded, setLoaded] = useState(() => retried)
      useEffect(() => {
        if (online && !Loaded) load().then((C) => setLoaded(() => (retried = C)), () => {})
      }, [online, Loaded])
      if (Loaded) return <Loaded {...props} />
      return (
        <p role="status" className="py-8 text-center text-sm text-muted-foreground">
          This needs a connection. Try again when you&apos;re back online.
        </p>
      )
    }
  })
}
