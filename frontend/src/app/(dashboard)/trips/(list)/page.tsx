import type { Metadata } from "next"
import { ViewTransition } from "react"

import { TripsScreen } from "@/features/trip/screens/TripsScreen"

export const metadata: Metadata = { title: "Trips" }

export default function Page() {
  return (
    <ViewTransition name="trip-list" enter={{ "trip-leave": "auto", default: "none" }} default="none">
      <TripsScreen />
    </ViewTransition>
  )
}
