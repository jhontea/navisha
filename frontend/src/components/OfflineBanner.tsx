"use client"

import { useState, useSyncExternalStore } from "react"
import { useParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { WifiOff } from "lucide-react"

import { useOnline } from "@/lib/useOnline"

/** "5 min ago", "2 hours ago", or "27 Oct" once it is a day old. */
export function formatSavedAgo(updatedAt: number, now: number): string {
  const minutes = Math.floor((now - updatedAt) / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`
  return new Date(updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

/** Tells the user they are reading saved data while offline (writes are refused in lib/api.ts). */
export function OfflineBanner() {
  return useOnline() ? null : <OfflineNotice />
}

function OfflineNotice() {
  const { id } = useParams<{ id?: string }>()
  const queryClient = useQueryClient()
  // shortcut: time is taken when the notice appears and does not tick; fine for a status line.
  const [now] = useState(() => Date.now())
  const cache = queryClient.getQueryCache()
  // Subscribed: after an offline reload the saved trips are restored a moment after this mounts.
  const updatedAt = useSyncExternalStore(
    (onChange) => cache.subscribe(onChange),
    () =>
      id
        ? (cache.find({ queryKey: ["trips", "detail", id], exact: true })?.state.dataUpdatedAt ?? 0)
        : Math.max(0, ...cache.findAll({ queryKey: ["trips"] }).map((q) => q.state.dataUpdatedAt)),
    () => 0,
  )

  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-info-bg px-4 py-2 text-sm text-foreground">
      <WifiOff className="h-4 w-4 shrink-0 text-info" aria-hidden="true" />
      <span>
        You&apos;re offline · showing saved data
        {updatedAt > 0 && <> (updated {formatSavedAgo(updatedAt, now)})</>}
      </span>
    </div>
  )
}
