import { BackLink } from "@/components/BackLink"
import { CurrencyConverter } from "@/features/currency/components/CurrencyConverter"

export default function CurrencyPage() {
  return (
    <div className="mx-auto max-w-max-width w-full px-margin-mobile md:px-margin-desktop py-6 pb-28 animate-fade-in">
      <BackLink href="/dashboard" className="mb-6" />

      {/* Page header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold tracking-tight text-gradient-sunset md:text-3xl">
            Currency Converter
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Convert between currencies using live exchange rates
        </p>
      </header>

      <div className="glass rounded-2xl p-6 md:p-8">
        <CurrencyConverter />
      </div>
    </div>
  )
}
