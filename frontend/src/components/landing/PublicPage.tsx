import type { ReactNode } from "react"

import { Footer } from "./Footer"
import { Navbar } from "./Navbar"

/**
 * Shell for public text pages (Privacy, Terms, Contact): the landing navbar,
 * a dusk-navy header with a two-tone title, and the content in a soft card.
 */
export function PublicPage({
  title,
  accent,
  intro,
  meta,
  children,
}: {
  title: string
  /** Muted second part of the title. */
  accent?: string
  intro?: ReactNode
  /** Small chip, e.g. "Last updated: 14 Oct 2026". */
  meta?: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-margin-mobile pb-16 pt-4 md:px-margin-desktop md:pt-6">
        <header className="bg-cover-fallback rounded-3xl px-6 py-10 text-on-cover sm:px-10 md:py-14">
          {meta && (
            <span className="inline-block rounded-full bg-cover-button/90 px-3 py-1 text-xs font-extrabold text-cover-button-foreground">
              {meta}
            </span>
          )}
          <h1 className="mt-4 text-balance font-display text-4xl font-extrabold leading-tight md:text-5xl">
            {title}
            {accent && <span className="opacity-70"> {accent}</span>}
          </h1>
          {intro && <p className="mt-3 max-w-2xl font-semibold text-on-cover/80">{intro}</p>}
        </header>
        <div className="-mt-6 px-2 sm:px-6">{children}</div>
      </main>
      <Footer />
    </div>
  )
}

/** Article body for legal text, inside a soft card. */
export function LegalArticle({ children }: { children: ReactNode }) {
  return (
    <article className="relative space-y-7 rounded-3xl border bg-card p-6 text-sm leading-relaxed shadow-card sm:text-base sm:p-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-foreground [&_p]:mt-2 [&_p]:text-muted-foreground [&_p.font-medium]:font-bold [&_p.font-medium]:text-foreground [&_section>h2+p]:mt-2 [&_table]:mt-3 [&_ul]:mt-2">
      {children}
    </article>
  )
}
