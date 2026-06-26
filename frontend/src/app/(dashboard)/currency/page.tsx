import { BackLink } from "@/components/BackLink"
import { CurrencyConverter } from "@/features/currency/components/CurrencyConverter"

export default function CurrencyPage() {
  return (
    <div className="mx-auto max-w-max-width w-full px-margin-mobile md:px-margin-desktop py-6 pb-28 animate-fade-in">
      <BackLink href="/dashboard" className="mb-6" />

      {/* Page header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary" aria-hidden="true"><path d="M2 12h20"/><path d="m16 6 6 6-6 6"/><path d="m8 6-6 6 6 6"/></svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Currency Converter
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground ml-[52px]">
          Convert between currencies using live exchange rates
        </p>
      </header>

      <div className="glass rounded-2xl p-6 md:p-8">
        <CurrencyConverter />
      </div>
    </div>
  )
}
