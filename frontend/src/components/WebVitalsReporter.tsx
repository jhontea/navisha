"use client"

import { useReportWebVitals } from "next/web-vitals"

type WebVital = {
  id: string
  name: string
  value: number
  delta: number
  rating: string
  navigationType: string
}

function normalizedRoute(pathname: string): string {
  return pathname
    .split("/")
    .map((segment) =>
      /^\d+$/.test(segment) ||
      /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment) ||
      segment.length > 20
        ? ":id"
        : segment,
    )
    .join("/")
}

function report(metric: WebVital) {
  if (process.env.NODE_ENV !== "production") return
  const payload = JSON.stringify({
    id: metric.id,
    name: metric.name,
    value: metric.value,
    delta: metric.delta,
    rating: metric.rating,
    navigation_type: metric.navigationType,
    route: normalizedRoute(window.location.pathname),
  })

  if (!navigator.sendBeacon("/api/vitals", payload)) {
    void fetch("/api/vitals", {
      method: "POST",
      body: payload,
      keepalive: true,
    })
  }
}

export function WebVitalsReporter() {
  useReportWebVitals(report)
  return null
}
