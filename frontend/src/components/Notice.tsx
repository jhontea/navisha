import type { ReactNode } from "react"
import { AlertCircle, AlertTriangle } from "lucide-react"

/** Inline warning or error with a title, e.g. an AI request that hit the daily limit or failed. */
export function Notice({ tone, title, children }: { tone: "warning" | "error"; title: string; children: ReactNode }) {
  const Icon = tone === "warning" ? AlertTriangle : AlertCircle
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "warning"
          ? "mb-4 flex items-start gap-2 rounded-2xl bg-warning-bg p-3 text-sm text-foreground"
          : "mb-4 flex items-start gap-2 rounded-2xl bg-destructive/5 p-3 text-sm text-foreground"
      }
    >
      <Icon className={tone === "warning" ? "mt-0.5 h-4 w-4 shrink-0 text-warning" : "mt-0.5 h-4 w-4 shrink-0 text-destructive"} aria-hidden="true" />
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground">{children}</p>
      </div>
    </div>
  )
}
