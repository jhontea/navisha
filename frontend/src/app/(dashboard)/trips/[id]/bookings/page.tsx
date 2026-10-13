import type { Metadata } from "next"

import { BookingsScreen } from "@/features/trip/screens/BookingsScreen"

export const metadata: Metadata = { title: "Bookings" }

export default function Page() {
  return <BookingsScreen />
}
