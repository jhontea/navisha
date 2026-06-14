import Link from "next/link"
import { CurrencyConverter } from "@/features/currency/components/CurrencyConverter"

export default function CurrencyPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Currency converter</h1>
        <p className="text-sm text-muted-foreground">
          Live rates from CurrencyFreaks. Supported: IDR, USD, JPY, SGD, KRW.
        </p>
      </div>
      <CurrencyConverter />
    </main>
  )
}
