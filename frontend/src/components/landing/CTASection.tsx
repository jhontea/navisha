import Link from "next/link"

import { GoogleIcon } from "@/components/GoogleIcon"
import { buttonVariants } from "@/components/ui/button"

export function CTASection() {
  return (
    <section className="mx-auto max-w-max-width px-margin-mobile pb-16 md:px-margin-desktop">
      <div className="bg-cover-fallback rounded-3xl px-6 py-12 text-center text-on-cover md:py-16">
        <h2 className="text-balance font-display text-3xl font-extrabold md:text-4xl">
          Start planning <span className="opacity-70">your next trip</span>
        </h2>
        <p className="mx-auto mt-3 max-w-md font-semibold text-on-cover/80">Free to use. Sign in with Google and create your first trip.</p>
        <Link href="/login" prefetch={false} className={buttonVariants({ variant: "cover", size: "lg", className: "mt-7" })}>
          <GoogleIcon className="h-5 w-5 shrink-0" />
          Continue with Google
        </Link>
      </div>
    </section>
  )
}
