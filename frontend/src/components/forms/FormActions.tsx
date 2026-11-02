import type { ReactNode } from "react"
import { AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type FormActionsProps = {
  submitLabel: string
  submittingLabel?: string
  cancelLabel?: string
  isSubmitting?: boolean
  submitDisabled?: boolean
  submitAriaDescribedBy?: string
  onCancel?: () => void
  onSubmit?: () => void
  submitType?: "submit" | "button"
  submitIcon?: ReactNode
  className?: string
  /** Inline save error shown above the buttons (E2); a new `errorKey` replays the shake. */
  error?: string | null
  errorKey?: number
}

export function FormActions({
  submitLabel,
  submittingLabel = "Saving…",
  cancelLabel = "Cancel",
  isSubmitting = false,
  submitDisabled = false,
  submitAriaDescribedBy,
  onCancel,
  onSubmit,
  submitType = "submit",
  submitIcon,
  className,
  error,
  errorKey,
}: FormActionsProps) {
  return (
    <div className={cn("border-t border-border/40 pt-4", className)}>
      {error && (
        <p
          key={errorKey}
          // The message pushes the buttons down; keep them on screen in a scrolled sheet.
          ref={(el) => el?.parentElement?.scrollIntoView({ block: "nearest" })}
          role="alert"
          className="animate-save-error mb-4 flex items-start gap-2 rounded-2xl bg-destructive-bg px-3 py-2.5 text-sm font-semibold text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" size="lg" onClick={onCancel} disabled={isSubmitting} className="w-full rounded-xl sm:w-auto">
            {cancelLabel}
          </Button>
        )}
        <Button type={submitType} size="lg" onClick={onSubmit} disabled={isSubmitting || submitDisabled} aria-describedby={submitAriaDescribedBy} className="w-full min-w-32 rounded-xl sm:w-auto">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : submitIcon}
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      </div>
    </div>
  )
}
