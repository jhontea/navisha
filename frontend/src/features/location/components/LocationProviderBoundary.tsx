"use client"

import type { ReactNode } from "react"
import { APIProvider } from "@vis.gl/react-google-maps"
import { LOCATION_PROVIDER } from "../config"

const GOOGLE_MAPS_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""

export function LocationProviderBoundary({ children }: { children: ReactNode }) {
  if (LOCATION_PROVIDER !== "google") return children

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={["places"]}>
      {children}
    </APIProvider>
  )
}
