import { BackLink } from "@/components/BackLink"
import { CurrencyConverter } from "@/features/currency/components/CurrencyConverter"

export default function CurrencyPage() {
  return (
    <div className="mx-auto max-w-max-width w-full px-margin-mobile md:px-margin-desktop py-12 pb-24">
      <BackLink href="/dashboard" className="mb-6" />
      <div className="glass-lg rounded-2xl p-6 md:p-8">
        <CurrencyConverter />
      </div>
    </div>
  )
}
