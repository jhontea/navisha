import type { Metadata } from "next"

import { BackLink } from "@/components/BackLink"
import { LazyCurrencyConverter } from "@/features/currency/components/LazyCurrencyConverter"

export const metadata: Metadata = { title: "Currency converter" }

export default function CurrencyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-margin-mobile pb-28 pt-4 md:px-margin-desktop md:pt-6">
      <BackLink href="/profile" label="Back to Profile" className="mb-4" />
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Currency converter</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live exchange rates for the currencies Navisha supports.</p>
      </header>
      <LazyCurrencyConverter />
    </div>
  )
}
