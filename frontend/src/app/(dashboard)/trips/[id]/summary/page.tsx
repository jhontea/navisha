"use client"

import dynamic from "next/dynamic"
import { useParams } from "next/navigation"

const TripSummaryCard = dynamic(
  () => import("@/features/summary/components/TripSummaryCard").then((m) => m.TripSummaryCard),
  {
    ssr: false,
    loading: () => <div className="h-40 animate-pulse rounded-xl bg-muted" aria-hidden="true" />,
  },
)

/** AI trip summary (moved out of the former Overview tab in D3). */
export default function TripSummaryPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <main className="mx-auto w-full max-w-max-width px-margin-mobile pb-6 pt-6 md:px-margin-desktop md:pb-8">
      <TripSummaryCard tripId={id} />
    </main>
  )
}
