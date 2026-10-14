import { BoardingPass } from "@/features/transportation/components/BoardingPass"
import type { TimelineTransport } from "../../lib/timeline"

/** Read-only transport entry on a day's timeline, drawn as a boarding pass (edited in Bookings). */
export function TransportTimelineCard({ t }: { t: TimelineTransport }) {
  return <BoardingPass transportation={t} showDate={false} className="shadow-none" />
}
