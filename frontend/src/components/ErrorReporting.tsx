"use client"

import { useEffect } from "react"

import { initErrorReporting } from "@/lib/errorReporting"

/** Starts error reporting after the page loads (no-op without a DSN). */
export function ErrorReporting() {
  useEffect(() => {
    initErrorReporting()
  }, [])
  return null
}
