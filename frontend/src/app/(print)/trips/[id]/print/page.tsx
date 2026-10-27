import type { Metadata } from "next"

import { TripPrintView } from "@/features/trip/screens/TripPrintView"

export const metadata: Metadata = { title: "Print itinerary" }

export default function Page() {
  return <TripPrintView />
}
