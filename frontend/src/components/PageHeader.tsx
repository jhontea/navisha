import type { ReactNode } from "react"

import { BackLink } from "@/components/BackLink"
import { cn } from "@/lib/utils"

/**
 * Page title block for app pages without a cover (New trip, AI, Currency,
 * Profile): optional back pill, two-tone display title, one line of context.
 */
export function PageHeader({
  title,
  accent,
  description,
  back,
  children,
  className,
}: {
  title: string
  /** Muted second part of the title. */
  accent?: string
  description?: ReactNode
  back?: { href: string; label: string }
  /** Extra content under the description (badges, quota). */
  children?: ReactNode
  className?: string
}) {
  return (
    <header className={cn("mb-6", className)}>
      {back && <BackLink href={back.href} label={back.label} className="mb-4" />}
      <h1 className="text-balance font-display text-3xl font-extrabold leading-tight text-foreground md:text-4xl">
        {title}
        {accent && <span className="text-muted-foreground"> {accent}</span>}
      </h1>
      {description && <p className="mt-2 max-w-2xl text-sm font-semibold text-muted-foreground md:text-base">{description}</p>}
      {children}
    </header>
  )
}
