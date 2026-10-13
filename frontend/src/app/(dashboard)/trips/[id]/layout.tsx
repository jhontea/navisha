import type { ReactNode } from "react"

import { TripShell } from "@/features/trip/screens/TripShell"

/** Trip header and tabs around every trip page (client shell). */
export default function TripLayout({ children }: { children: ReactNode }) {
  return <TripShell>{children}</TripShell>
}
