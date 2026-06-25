import { BackLink } from "@/components/BackLink"
import { CurrencyConverter } from "@/features/currency/components/CurrencyConverter"

export default function CurrencyPage() {
  return (
    <div className="mx-auto max-w-max-width w-full px-margin-mobile md:px-margin-desktop py-12">
      <BackLink href="/dashboard" className="mb-6" />
      <CurrencyConverter />
    </div>
  )
}
