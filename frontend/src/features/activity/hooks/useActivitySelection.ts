import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { toast } from "@/lib/toast"
import type { Day } from "@/features/trip/types"
import { activityApi } from "../api"
import type { Activity } from "../types"

/**
 * Multi-select on a day's activities (W-PLAN-09) and copying the selection
 * to another day. Select mode is controlled by the caller (the day header
 * menu turns it on); reorder is disabled while it is on.
 */
export function useActivitySelection(
  dayId: string,
  days: Day[],
  activities: Activity[],
  selectMode: boolean,
  setSelectMode: (on: boolean) => void,
) {
  const qc = useQueryClient()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [copying, setCopying] = useState(false)

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelectedIds(new Set(activities.map((a) => a.id)))
  const clearSelection = () => setSelectedIds(new Set())

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  // Copy selected activities to a target day. Each activity is duplicated via
  // the existing create endpoint (no backend change). Payload is preserved
  // verbatim; start/end times carry over so the copied slot keeps its time.
  const copyToDay = async (targetDayId: string) => {
    const target = days.find((d) => d.id === targetDayId)
    if (!target) return
    if (targetDayId === dayId) {
      toast("Cannot copy to the same day.", "error")
      return
    }
    const selected = activities.filter((a) => selectedIds.has(a.id))
    if (selected.length === 0) return

    setCopying(true)
    let ok = 0
    let fail = 0
    for (const a of selected) {
      try {
        await activityApi.create(targetDayId, {
          type: a.type,
          title: a.title,
          start_time: a.start_time || undefined,
          end_time: a.end_time || undefined,
          payload: a.payload ?? undefined,
        })
        ok++
      } catch {
        fail++
      }
    }
    setCopying(false)

    // Invalidate target day so the new copies show up.
    qc.invalidateQueries({ queryKey: ["activities", "list", targetDayId], refetchType: "active" })

    if (fail === 0) {
      toast(`Copied ${ok} ${ok === 1 ? "activity" : "activities"} to Day ${target.day_number}.`)
    } else if (ok === 0) {
      toast("Failed to copy activities. Please try again.", "error")
    } else {
      toast(`Copied ${ok}, ${fail} failed.`, "error")
    }

    exitSelectMode()
  }

  return {
    selectMode,
    selectedIds,
    copying,
    toggleSelect,
    selectAll,
    clearSelection,
    exitSelectMode,
    copyToDay,
  }
}

export type ActivitySelection = ReturnType<typeof useActivitySelection>
