import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { cn } from "@/lib/utils"

/** Back-navigation link shown above a page title. */
export function BackLink({
  href,
  label = "Back to Home",
  className,
}: {
  href: string
  label?: string
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        "-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  )
}
