import { CheckSquare, Copy, X } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Day } from "@/features/trip/types"
import type { ActivitySelection } from "../../hooks/useActivitySelection"

/** "Select" toggle, and in select mode: count, All/Clear, Copy to… and exit. */
export function ActivitySelectToolbar({
  selection,
  activityCount,
  dayId,
  days,
}: {
  selection: ActivitySelection
  activityCount: number
  dayId: string
  days: Day[]
}) {
  const { selectMode, selectedIds, copying } = selection

  return (
    <div className="flex items-center justify-between gap-2">
      {!selectMode ? (
        <button
          type="button"
          onClick={selection.startSelectMode}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <CheckSquare className="h-3.5 w-3.5" />
          Select
        </button>
      ) : (
        <div className="flex w-full flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-foreground">
            {selectedIds.size} selected
          </span>
          <button
            type="button"
            onClick={selectedIds.size === activityCount ? selection.clearSelection : selection.selectAll}
            className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {selectedIds.size === activityCount ? "Clear" : "All"}
          </button>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={selectedIds.size === 0 || copying}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Copy className="h-3.5 w-3.5" />
                {copying ? "Copying…" : "Copy to…"}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Copy to day</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {days
                    .filter((d) => d.id !== dayId)
                    .map((d) => (
                      <DropdownMenuItem key={d.id} onClick={() => selection.copyToDay(d.id)}>
                        Day {d.day_number}
                        <span className="ml-auto text-xs text-muted-foreground">
                          {new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              onClick={selection.exitSelectMode}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Exit select mode"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
