import type { Metadata } from "next"

import { SharedTripPage } from "@/features/trip/components/share/SharedTripPage"
import { sharedTripPreview, sharedTripUrl } from "@/features/trip/lib/sharedTrip"
import type { PublicItinerary } from "@/features/trip/types"

type Props = { params: { token: string } }

/**
 * Link preview for chat apps (WhatsApp, Slack, …): title, dates and cover.
 * Share links are private, so the page is never indexed.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const robots = { index: false, follow: false }
  let trip: PublicItinerary | null = null
  try {
    const response = await fetch(sharedTripUrl(params.token), { next: { revalidate: 300 } })
    if (response.ok) trip = await response.json()
  } catch {
    // Network errors fall back to the generic preview below.
  }
  if (!trip) return { title: "Shared trip", robots }

  const { title, description, image } = sharedTripPreview(trip)
  return {
    title,
    description,
    robots,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Navisha",
      ...(image ? { images: [{ url: image, width: 1200 }] } : {}),
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description },
  }
}

export default function SharedTripRoute({ params }: Props) {
  return <SharedTripPage token={params.token} />
}
