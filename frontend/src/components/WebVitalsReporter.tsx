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

function clientDimensions() {
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  const isAndroid = /Android/i.test(ua)

  let browser = "other"
  if (isIOS) {
    if (/CriOS/i.test(ua)) browser = "crios"
    else if (/FxiOS/i.test(ua)) browser = "fxios"
    else browser = "safari"
  } else if (/Edg\//i.test(ua)) browser = "edge"
  else if (/Chrome\//i.test(ua)) browser = "chrome"
  else if (/Safari\//i.test(ua)) browser = "safari"

  return {
    platform: isIOS ? "ios" : isAndroid ? "android" : "desktop",
    browser,
    device_class: window.matchMedia("(pointer: coarse)").matches
      ? "touch"
      : "desktop",
  }
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
    ...clientDimensions(),
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
