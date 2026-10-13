import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** One feature on the landing page: icon, title, one sentence, optional UI sample. */
export function FeatureCard({
  Icon,
  title,
  description,
  visual,
  className,
}: {
  Icon: LucideIcon
  title: string
  description: string
  visual?: ReactNode
  className?: string
}) {
  return (
    <article className={cn("flex flex-col rounded-xl border bg-card p-5 md:p-6", className)}>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      {visual && (
        <div className="mt-5 rounded-lg border bg-background p-3" aria-hidden="true">
          {visual}
        </div>
      )}
    </article>
  )
}
