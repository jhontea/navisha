import { BackLink } from "@/components/BackLink"
import { CurrencyConverter } from "@/features/currency/components/CurrencyConverter"

export default function CurrencyPage() {
  return (
    <div className="mx-auto max-w-max-width w-full px-margin-mobile md:px-margin-desktop py-6 pb-28 animate-fade-in">
      <BackLink href="/dashboard" label="Back to Dashboard" className="mb-6" />

      {/* Page header */}
      <header className="mb-10 text-center">
        <h1 className="text-headline-lg font-headline-lg text-gradient-sunset mb-2">
          Currency Converter
        </h1>
        <p className="text-body-md font-body-md text-muted-foreground">
          Real-time exchange rates for your next adventure.
        </p>
      </header>

      <div className="glass rounded-2xl p-6 md:p-8">
        <CurrencyConverter />
      </div>
    </div>
  )
}
