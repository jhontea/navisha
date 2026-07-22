"use client"

import { useState } from "react"
import { Loader2, MapPin, Sparkles, X } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { GeneratingIndicator } from "@/components/GeneratingIndicator"
import { tripApi } from "@/features/trip/api"
import type { ActivityDraft, DayPreview, TripDraft } from "@/features/trip/types"
import { resolveDraftLocations } from "@/features/trip/lib/resolveDraftLocations"
import { toast } from "@/lib/toast"
import { activityApi } from "../api"
import type { CreateActivityInput } from "../types"

interface Props {
  tripId: string
  dayId: string
  date: string
  dayNumber: number
  destination?: string
  existingCount: number
}

const DAY_GENERATION_MESSAGES = [
  "Reading your day...",
  "Finding open time slots...",
  "Matching places to your route...",
  "Balancing activities and breaks...",
  "Preparing your day plan...",
]

export function DayAIPlanner({
  tripId,
  dayId,
  date,
  dayNumber,
  destination = "",
  existingCount,
}: Props) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [instruction, setInstruction] = useState("")
  const [preview, setPreview] = useState<DayPreview | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const hasAnchors = existingCount > 0

  const closePlanner = () => {
    setPreview(null)
    setInstruction("")
    setOpen(false)
  }

  const generate = async () => {
    setIsGenerating(true)
    try {
      setPreview(await tripApi.generateDayPreview(tripId, dayId, instruction.trim()))
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not generate this day.", "error")
    } finally {
      setIsGenerating(false)
    }
  }

  const apply = async () => {
    if (!preview?.activities.length) return
    setIsApplying(true)
    try {
      const wrapper: TripDraft = {
        title: "Day preview",
        destination,
        total_days: 1,
        travel_style: "",
        summary: "",
        base_currency: "",
        budget: 0,
        tips: [],
        days: [{ day_number: dayNumber, date, theme: preview.theme, activities: preview.activities }],
      }
      const resolved = await resolveDraftLocations(wrapper, destination)
      const failed: ActivityDraft[] = []
      let added = 0

      for (const suggestion of resolved.days[0].activities) {
        if (suggestion.lat == null || suggestion.lng == null) {
          failed.push(suggestion)
          continue
        }
        const input: CreateActivityInput = {
          type: "location",
          title: suggestion.title,
          start_time: suggestion.start_time,
          end_time: suggestion.end_time,
          payload: {
            location_name: suggestion.location_name || suggestion.title,
            address: suggestion.address,
            lat: suggestion.lat,
            lng: suggestion.lng,
            google_place_id: suggestion.google_place_id,
            notes: suggestion.notes,
            image_urls: [],
          },
        }
        try {
          await activityApi.create(dayId, input)
          added++
        } catch {
          failed.push(suggestion)
        }
      }

      await qc.invalidateQueries({ queryKey: ["activities", "list", dayId], refetchType: "all" })
      if (failed.length === 0) {
        toast(`${added} AI suggestion${added === 1 ? "" : "s"} added to Day ${dayNumber}.`)
        setPreview(null)
        setInstruction("")
        setOpen(false)
      } else {
        setPreview({ ...preview, activities: failed })
        toast(
          added > 0
            ? `${added} added. ${failed.length} location${failed.length === 1 ? "" : "s"} could not be resolved.`
            : "The suggested locations could not be resolved. Try generating again.",
          "error",
        )
      }
    } finally {
      setIsApplying(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-2 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-chromatic-aurora/10 to-chromatic-sky/10 px-4 py-3 text-sm font-semibold text-primary shadow-sm shadow-primary/5 transition-all hover:border-primary/50 hover:from-primary/15 hover:via-chromatic-aurora/15 hover:to-chromatic-sky/15 hover:shadow-md hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Sparkles className="h-4 w-4 transition-transform duration-200 group-hover:rotate-12" aria-hidden="true" />
        {hasAnchors ? "Build around existing activities" : "Plan this day with AI"}
      </button>
    )
  }

  return (
    <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5" aria-label="AI day planner">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            {hasAnchors ? "Build around your plan" : "Plan Day " + dayNumber}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasAnchors
              ? `Your ${existingCount} existing ${existingCount === 1 ? "activity stays" : "activities stay"} unchanged.`
              : "AI will suggest a balanced day. Nothing is saved yet."}
          </p>
        </div>
        <button type="button" onClick={closePlanner} disabled={isGenerating || isApplying} aria-label="Close AI planner" className="rounded-lg p-1.5 text-muted-foreground hover:bg-background hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {!preview ? (
        isGenerating ? (
          <GeneratingIndicator
            messages={DAY_GENERATION_MESSAGES}
            rotateIntervalMs={1800}
            helperText="Existing activities will stay unchanged."
          />
        ) : (
          <div className="space-y-3">
            <Textarea
              value={instruction}
              onChange={(event) => setInstruction(event.target.value.slice(0, 500))}
              placeholder="Optional: local food, relaxed pace, indoor places..."
              className="bg-background"
              rows={2}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{instruction.length}/500</span>
              <Button type="button" size="sm" variant="gradient" onClick={generate} className="rounded-full px-5">
                <Sparkles className="h-4 w-4" />
                Generate plan
              </Button>
            </div>
          </div>
        )
      ) : (
        <div className="space-y-4">
          {preview.theme && <p className="text-sm font-medium text-foreground">{preview.theme}</p>}
          <ul className="space-y-2">
            {preview.activities.map((activity, index) => (
              <li key={`${activity.title}-${index}`} className="flex gap-3 rounded-xl border border-border/40 bg-background p-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">{activity.start_time}–{activity.end_time} · {activity.location_name}</p>
                  {activity.notes && <p className="mt-1 text-xs text-muted-foreground">{activity.notes}</p>}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">Existing activities will not be changed. Only these suggestions will be added.</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" size="sm" variant="outline" onClick={closePlanner} disabled={isApplying}>Cancel</Button>
            <Button type="button" size="sm" variant="gradient" onClick={apply} disabled={isApplying} className="rounded-full px-5">
              {isApplying && <Loader2 className="h-4 w-4 animate-spin" />}
              {isApplying ? "Adding..." : `Add ${preview.activities.length} to Day ${dayNumber}`}
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
