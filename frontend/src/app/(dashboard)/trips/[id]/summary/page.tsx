import type { Metadata } from "next"

import { SummaryScreen } from "@/features/summary/screens/SummaryScreen"

export const metadata: Metadata = { title: "Summary" }

export default function Page() {
  return <SummaryScreen />
}
