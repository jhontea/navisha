import { cache } from "react"
import type { Metadata } from "next"

import { SharedTripPage } from "@/features/trip/components/share/SharedTripPage"
import { fetchSharedTrip, sharedTripPreview } from "@/features/trip/lib/sharedTrip"

type Props = { params: { token: string } }

// One API call per request, shared by generateMetadata and the page.
const getSharedTrip = cache(fetchSharedTrip)

/**
 * Link preview for chat apps (WhatsApp, Slack, …): title, dates and cover.
 * Share links are private, so the page is never indexed.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const robots = { index: false, follow: false }
  const result = await getSharedTrip(params.token)
  if (result?.status !== "ready") return { title: "Shared trip", robots }

  const { title, description, image } = sharedTripPreview(result.trip)
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

/** Rendered on the server with the trip, so visitors see it without a loading state. */
export default async function SharedTripRoute({ params }: Props) {
  const result = await getSharedTrip(params.token)
  return <SharedTripPage token={params.token} initial={result ?? undefined} />
}
