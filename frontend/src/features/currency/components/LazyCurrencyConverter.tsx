"use client"

import dynamic from "next/dynamic"

const CurrencyConverter = dynamic(
  () => import("./CurrencyConverter").then((module) => module.CurrencyConverter),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-80 animate-pulse rounded-xl bg-muted/30"
        role="status"
        aria-label="Loading currency converter"
      />
    ),
  },
)

export function LazyCurrencyConverter() {
  return <CurrencyConverter />
}
