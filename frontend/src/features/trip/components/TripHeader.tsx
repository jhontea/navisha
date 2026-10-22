"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { ArrowLeft, MoreHorizontal, Pencil, Share2, Trash2 } from "lucide-react"

import { IconButton } from "@/components/IconButton"
import { StatusChip } from "@/components/StatusChip"
import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { formatTripRange, tripTimingLabel } from "../lib/home"
import { getTripDateMetrics } from "../lib/status"
import { resolveTripCover, tripCoverSrcSet } from "../lib/cover"
import { CoverDestination } from "./CoverDestination"
import { splitTripTitle } from "../lib/title"
import type { Trip } from "../types"

const TripShareDialog = dynamic(
  () => import("./TripShareDialog").then((m) => m.TripShareDialog),
  { ssr: false },
)

const MENU_ITEM = "min-h-10 px-3 text-sm"

/**
 * Trip hero (docs/DESIGN.md §5 TripCover): the cover illustration with round
 * buttons on top (back, share, ⋯). Desktop puts the two-tone title on the
 * cover; phones put it under the cover so the picture stays clean.
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
  const nights = Math.max(0, metrics.totalDays - 1)
  const timing = tripTimingLabel(metrics)
  const { main, rest } = splitTripTitle(trip.title)
  const range = formatTripRange(trip.start_date, trip.end_date)
  const cover = resolveTripCover(trip.cover_image_url, trip.description, 1600)
  const srcSet = cover ? tripCoverSrcSet(trip.cover_image_url, trip.description, [768, 1280, 1600]) : undefined
  const meta = [range, `${nights} ${nights === 1 ? "night" : "nights"}`].filter(Boolean).join(" · ")
  const timingTone = metrics.status === "past" ? "neutral" : "info"

  // A labelled section, not a header: outside <main> a header is a second banner landmark.
  return (
    <section aria-label="Trip details" className="md:mx-auto md:w-full md:max-w-max-width md:px-margin-desktop md:pt-2">
      <div className="bg-cover-fallback relative h-52 overflow-hidden rounded-b-3xl md:h-60 md:rounded-3xl">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            srcSet={srcSet}
            sizes="(min-width: 1600px) 1600px, 100vw"
            alt=""
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-[75%_50%]"
          />
        )}
        {/* Desktop already names the destination under the title. */}
        {!cover && <CoverDestination destination={trip.description} className="inset-0 m-auto h-fit justify-center px-4 text-lg md:hidden" />}
        {/* Keeps the title readable on the left of any cover. */}
        <div className="absolute inset-0 hidden bg-linear-to-r from-black/40 via-black/10 to-transparent md:block" aria-hidden="true" />

        <div className="absolute inset-x-3 top-3 flex items-center gap-2 md:inset-x-5 md:top-5">
          <Link
            href="/trips"
            aria-label="Back to Trips"
            className={buttonVariants({ variant: "cover", size: "icon", className: "shrink-0" })}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <span className="hidden rounded-full bg-cover-button/90 px-3 py-1.5 text-xs font-extrabold text-cover-button-foreground md:inline">
            {timing}
          </span>
          <span className="flex-1" />
          <IconButton label="Share trip" icon={<Share2 />} variant="cover" onClick={() => setShareOpen(true)} />
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Trip actions"
              className={buttonVariants({ variant: "cover", size: "icon", className: "shrink-0" })}
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

        {/* Desktop: title on the cover, clear of the tabs that overlap the bottom edge. */}
        <div className="absolute bottom-12 left-8 hidden max-w-[60%] flex-col items-start gap-1.5 text-on-cover md:flex">
          <h1 className="line-clamp-2 font-display text-3xl font-extrabold leading-tight text-balance lg:text-hero">
            {main}
            {rest && <span className="opacity-70"> {rest}</span>}
          </h1>
          <p className="text-sm font-semibold text-on-cover/85 tabular-nums">
            {meta}
            {trip.description && <span> · {trip.description}</span>}
          </p>
        </div>
      </div>

      {/* Phones: title under the cover. */}
      <div className="px-margin-mobile pt-4 md:hidden">
        <h1 className="font-display text-2xl font-extrabold leading-tight text-foreground text-balance">
          {main}
          {rest && <span className="text-muted-foreground"> {rest}</span>}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground tabular-nums">
          <StatusChip tone={timingTone}>{timing}</StatusChip>
          <span>{meta}</span>
        </div>
      </div>

      {shareOpen && <TripShareDialog tripId={trip.id} open={shareOpen} onOpenChange={setShareOpen} />}
    </section>
  )
}
