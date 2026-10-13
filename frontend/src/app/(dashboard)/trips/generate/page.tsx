import type { Metadata } from "next"

import { GenerateTripScreen } from "@/features/trip/screens/GenerateTripScreen"

export const metadata: Metadata = { title: "Generate a trip with AI" }

export default function Page() {
  return <GenerateTripScreen />
}
