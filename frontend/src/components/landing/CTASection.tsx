import Link from "next/link"

import { GoogleIcon } from "@/components/GoogleIcon"
import { buttonVariants } from "@/components/ui/button"

export function CTASection() {
  return (
    <section className="mx-auto max-w-max-width px-margin-mobile pb-16 md:px-margin-desktop">
      <div className="rounded-xl border bg-card px-6 py-10 text-center md:py-12">
        <h2 className="text-balance text-2xl font-semibold text-foreground md:text-3xl">Start planning your next trip</h2>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">Free to use. Sign in with Google and create your first trip.</p>
        <Link href="/login" className={buttonVariants({ size: "lg", className: "mt-6" })}>
          <GoogleIcon className="h-5 w-5 shrink-0" />
          Continue with Google
        </Link>
      </div>
    </section>
  )
}
