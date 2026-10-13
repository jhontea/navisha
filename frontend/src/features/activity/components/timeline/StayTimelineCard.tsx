import type { Accommodation } from "@/features/accommodation/types"

/** Read-only stay check-in / check-out entry on a day's timeline (edited in Bookings). */
export function StayTimelineCard({
  a,
  event,
}: {
  a: Accommodation
  event: "check_in" | "check_out"
}) {
  const meta = [a.location_name, a.confirmation_number && `#${a.confirmation_number}`].filter(Boolean).join(" · ")

  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{event === "check_in" ? "Check-in" : "Check-out"}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">{a.name}</p>
      {meta && <p className="mt-1 text-xs text-muted-foreground">{meta}</p>}
    </div>
  )
}
