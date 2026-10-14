"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { ArrowLeft, MoreHorizontal, Pencil, Share2, Trash2 } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn, formatDateRange } from "@/lib/utils"
import { getTripDateMetrics, tripProgressLabel } from "../lib/status"
import { canRenderTripCover, resolveTripCover } from "../lib/cover"
import type { Trip } from "../types"

const TripShareDialog = dynamic(
  () => import("./TripShareDialog").then((m) => m.TripShareDialog),
  { ssr: false },
)

const MENU_ITEM = "min-h-10 px-3 text-sm"

/**
 * Compact trip header (D3): back to Trips, small cover thumbnail, title,
 * dates and status, plus one ⋯ menu for Edit / Share / Delete. Replaces the
 * full-height hero so the trip content starts above the fold on phones.
 */
export function TripHeader({
  trip,
  onEdit,
  onDelete,
}: {
  trip: Pick<Trip, "id" | "title" | "description" | "start_date" | "end_date" | "base_currency" | "cover_image_url">
  onEdit: () => void
  onDelete: () => void
}) {
  const [shareOpen, setShareOpen] = useState(false)
  const metrics = getTripDateMetrics(trip.start_date, trip.end_date)
  const cover = resolveTripCover(trip.cover_image_url, trip.description, 160)

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex w-full max-w-max-width items-center gap-3 px-margin-mobile py-3 md:px-margin-desktop">
        <Link
          href="/trips"
          aria-label="Back to Trips"
          className={buttonVariants({ variant: "ghost", size: "icon", className: "-ml-2 shrink-0" })}
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>

        {canRenderTripCover(cover) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            aria-hidden="true"
            className="h-12 w-12 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <span className="h-12 w-12 shrink-0 rounded-lg bg-muted" aria-hidden="true" />
        )}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight text-foreground md:text-xl">
            {trip.title}
          </h1>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {formatDateRange(trip.start_date, trip.end_date)}
            <span aria-hidden="true"> · </span>
            {tripProgressLabel(metrics)}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Trip actions"
            className={buttonVariants({ variant: "ghost", size: "icon", className: "shrink-0" })}
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem className={MENU_ITEM} onClick={onEdit}>
              <Pencil aria-hidden="true" />
              Edit trip
            </DropdownMenuItem>
            <DropdownMenuItem className={MENU_ITEM} onClick={() => setShareOpen(true)}>
              <Share2 aria-hidden="true" />
              Share trip
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className={cn(MENU_ITEM)} variant="destructive" onClick={onDelete}>
              <Trash2 aria-hidden="true" />
              Delete trip
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {shareOpen && <TripShareDialog tripId={trip.id} open={shareOpen} onOpenChange={setShareOpen} />}
    </header>
  )
}
