"use client"

import ReactDOM from "react-dom"
import { RouteProgress } from "@/components/RouteProgress"
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration"
import { useTokenRefresh } from "@/features/auth/hooks"

const configuredAssetURL =
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "https://assets.navisha.cloud"

function assetOrigin() {
  try {
    return new URL(configuredAssetURL).origin
  } catch {
    return "https://assets.navisha.cloud"
  }
}

export function DashboardRuntime() {
  const origin = assetOrigin()
  ReactDOM.prefetchDNS(origin)
  ReactDOM.preconnect(origin, { crossOrigin: "anonymous" })
  useTokenRefresh()

  return (
    <>
      <RouteProgress />
      <ServiceWorkerRegistration />
    </>
  )
}
