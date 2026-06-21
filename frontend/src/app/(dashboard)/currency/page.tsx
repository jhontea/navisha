import Link from "next/link"
import { CurrencyConverter } from "@/features/currency/components/CurrencyConverter"

export default function CurrencyPage() {
  return (
    <div className="mx-auto max-w-max-width w-full px-margin-mobile md:px-margin-desktop py-12">
      {/* Back to dashboard */}
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Back to Dashboard
      </Link>

      <CurrencyConverter />
    </div>
  )
}
