import type { Metadata } from "next"

import { ItineraryScreen } from "@/features/activity/screens/ItineraryScreen"

export const metadata: Metadata = { title: "Itinerary" }

export default function Page() {
  return <ItineraryScreen />
}
