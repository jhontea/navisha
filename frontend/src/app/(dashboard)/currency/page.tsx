import type { Metadata } from "next"

import { PageHeader } from "@/components/PageHeader"
import { LazyCurrencyConverter } from "@/features/currency/components/LazyCurrencyConverter"

export const metadata: Metadata = { title: "Currency converter" }

export default function CurrencyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-margin-mobile pb-28 pt-6 md:px-margin-desktop md:pt-8">
      <PageHeader
        title="Currency"
        accent="converter"
        description="Live exchange rates for the currencies Navisha supports."
      />
      <LazyCurrencyConverter />
    </div>
  )
}
