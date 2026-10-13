import { Copy, X } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"

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

/** Select-mode bar: count, Select all/Clear, Copy to… and exit. */
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
  const { selectedIds, copying } = selection

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2">
      <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
      <button
        type="button"
        onClick={selectedIds.size === activityCount ? selection.clearSelection : selection.selectAll}
        className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {selectedIds.size === activityCount ? "Clear" : "Select all"}
      </button>
      <div className="ml-auto flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={selectedIds.size === 0 || copying}
            className={buttonVariants({ size: "sm" })}
          >
            <Copy aria-hidden="true" />
            {copying ? "Copying…" : "Copy to…"}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Copy to day</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {days
                .filter((d) => d.id !== dayId)
                .map((d) => (
                  <DropdownMenuItem key={d.id} className="min-h-10" onClick={() => selection.copyToDay(d.id)}>
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
          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          aria-label="Exit select mode"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
