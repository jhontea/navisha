import type { Metadata } from "next"

import { NewTripScreen } from "@/features/trip/screens/NewTripScreen"

export const metadata: Metadata = { title: "New trip" }

export default function Page() {
  return <NewTripScreen />
}
