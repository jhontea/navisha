import type { Metadata } from "next"

import { TripMapScreen } from "@/features/map/screens/TripMapScreen"

export const metadata: Metadata = { title: "Map" }

export default function Page() {
  return <TripMapScreen />
}
