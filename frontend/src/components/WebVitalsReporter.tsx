"use client"

import { useReportWebVitals } from "next/web-vitals"
import { useEffect } from "react"

type WebVital = {
  id: string
  name: string
  value: number
  delta: number
  rating: string
  navigationType: string
}

type VitalPayload = ReturnType<typeof createPayload>
const pendingMetrics = new Map<string, VitalPayload>()
let flushTimer: ReturnType<typeof setTimeout> | undefined
const FLUSH_DELAY_MS = 5_000
const MAX_BATCH_SIZE = 10

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

function createPayload(metric: WebVital) {
  return {
    id: metric.id,
    name: metric.name,
    value: metric.value,
    delta: metric.delta,
    rating: metric.rating,
    navigation_type: metric.navigationType,
    route: normalizedRoute(window.location.pathname),
    ...clientDimensions(),
  }
}

function flushMetrics() {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = undefined
  }
  if (pendingMetrics.size === 0) return

  const payload = JSON.stringify(Array.from(pendingMetrics.values()))
  pendingMetrics.clear()

  if (!navigator.sendBeacon("/api/vitals", payload)) {
    void fetch("/api/vitals", {
      method: "POST",
      body: payload,
      keepalive: true,
    })
  }
}

function report(metric: WebVital) {
  if (process.env.NODE_ENV !== "production") return
  pendingMetrics.set(`${metric.name}:${metric.id}`, createPayload(metric))

  if (pendingMetrics.size >= MAX_BATCH_SIZE) {
    flushMetrics()
    return
  }
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(flushMetrics, FLUSH_DELAY_MS)
}

export function WebVitalsReporter() {
  useReportWebVitals(report)

  useEffect(() => {
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") flushMetrics()
    }
    window.addEventListener("pagehide", flushMetrics)
    document.addEventListener("visibilitychange", flushWhenHidden)
    return () => {
      window.removeEventListener("pagehide", flushMetrics)
      document.removeEventListener("visibilitychange", flushWhenHidden)
      flushMetrics()
    }
  }, [])

  return null
}
