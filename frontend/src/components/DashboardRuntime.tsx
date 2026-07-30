"use client"

import { RouteProgress } from "@/components/RouteProgress"
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration"
import { useTokenRefresh } from "@/features/auth/hooks"

export function DashboardRuntime() {
  useTokenRefresh()

  return (
    <>
      <RouteProgress />
      <ServiceWorkerRegistration />
    </>
  )
}
