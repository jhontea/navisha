"use client"

import type { ReactNode } from "react"

import { locationProvider } from "../provider"

/** Loads what the configured provider needs in the browser (Google Places script; nothing for Geoapify). */
export function LocationProviderBoundary({ children }: { children: ReactNode }) {
  const { Boundary } = locationProvider
  return <Boundary>{children}</Boundary>
}
