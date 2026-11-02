import type { Metadata } from "next"

import { TripsScreen } from "@/features/trip/screens/TripsScreen"

export const metadata: Metadata = { title: "Trips" }

export default function Page() {
  return <TripsScreen />
}
