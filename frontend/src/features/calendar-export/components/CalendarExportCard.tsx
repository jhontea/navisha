"use client"

import { useState } from "react"
import { CalendarPlus, CalendarX, Check, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { ApiError } from "@/lib/api"
import {
  useCalendarExportStatus,
  useExportToCalendar,
  useRemoveFromCalendar,
} from "../hooks/useCalendarExport"

interface Props {
  tripId: string
}

type Banner =
  | { kind: "success"; text: string }
  | { kind: "reauth" }
  | { kind: "error"; text: string }
  | null

// API base for the OAuth re-login redirect when Google authorization is missing.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8090/api/v1"

function summarize(created: number, removed: number): string {
  const parts: string[] = []
  if (created > 0) parts.push(`added ${created} ${created === 1 ? "event" : "events"}`)
  if (removed > 0) parts.push(`removed ${removed} outdated ${removed === 1 ? "event" : "events"}`)
  if (parts.length === 0) return "Your Google Calendar is already up to date."
  // Capitalize first part.
  const sentence = parts.join(" and ")
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + " in your Google Calendar."
}

export function CalendarExportCard({ tripId }: Props) {
  const status = useCalendarExportStatus(tripId)
  const exportMut = useExportToCalendar(tripId)
  const removeMut = useRemoveFromCalendar(tripId)
  const [confirmExport, setConfirmExport] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [banner, setBanner] = useState<Banner>(null)

  const pending = exportMut.isPending || removeMut.isPending
  const exportedCount = status.data?.exported_count ?? 0
  const hasExports = exportedCount > 0

  function handleError(err: unknown) {
    if (err instanceof ApiError && err.code === "GOOGLE_REAUTH_REQUIRED") {
      setBanner({ kind: "reauth" })
      return
    }
    setBanner({ kind: "error", text: "Something went wrong. Please try again in a moment." })
  }

  function doExport() {
    setConfirmExport(false)
    setBanner(null)
    exportMut.mutate(undefined, {
      onSuccess: (res) => {
        setBanner({ kind: "success", text: summarize(res.created, res.removed) })
      },
      onError: handleError,
    })
  }

  function doRemove() {
    setConfirmRemove(false)
    setBanner(null)
    removeMut.mutate(undefined, {
      onSuccess: () => setBanner({ kind: "success", text: "Removed this trip's events from Google Calendar." }),
      onError: handleError,
    })
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <CalendarPlus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Google Calendar</h3>
            <p className="text-sm text-muted-foreground">
              {hasExports
                ? `${exportedCount} ${exportedCount === 1 ? "activity" : "activities"} synced. Re-sync to apply changes.`
                : "Add this trip's location activities to your Google Calendar."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button onClick={() => setConfirmExport(true)} disabled={pending} className="gap-1.5">
            {exportMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarPlus className="h-4 w-4" />
            )}
            {hasExports ? "Re-sync" : "Export to Calendar"}
          </Button>
          {hasExports && (
            <Button
              variant="outline"
              onClick={() => setConfirmRemove(true)}
              disabled={pending}
              className="gap-1.5"
            >
              {removeMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarX className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Remove</span>
            </Button>
          )}
        </div>
      </div>

      {banner?.kind === "success" && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{banner.text}</p>
        </div>
      )}

      {banner?.kind === "error" && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{banner.text}</p>
        </div>
      )}

      {banner?.kind === "reauth" && (
        <div className="mt-4 flex flex-col gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="font-medium">Google Calendar access needed</p>
          </div>
          <p className="text-xs opacity-90">
            Please sign in with Google again to grant calendar access, then try exporting.
          </p>
          <a
            href={`${API_BASE}/auth/google`}
            className="mt-1 inline-flex w-fit items-center rounded-md bg-amber-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 dark:bg-amber-100 dark:text-amber-950"
          >
            Sign in with Google
          </a>
        </div>
      )}

      <ConfirmDialog
        open={confirmExport}
        onOpenChange={setConfirmExport}
        title={hasExports ? "Re-sync with Google Calendar?" : "Export to Google Calendar?"}
        description="This adds an event for each location activity in this trip to your primary Google Calendar, using the times you entered. Activities you've removed since the last export are deleted from the calendar; ones already there stay as-is."
        confirmLabel={hasExports ? "Re-sync" : "Export"}
        onConfirm={doExport}
        isPending={exportMut.isPending}
      />

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Remove from Google Calendar?"
        description="This deletes the events this trip created in your Google Calendar. Your trip data in Navisha is not affected."
        confirmLabel="Remove"
        destructive
        onConfirm={doRemove}
        isPending={removeMut.isPending}
      />
    </div>
  )
}
