import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"
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
}: FormActionsProps) {
  return (
    <div className={cn("flex flex-col-reverse gap-3 border-t border-border/40 pt-4 sm:flex-row sm:justify-end", className)}>
      {onCancel && (
        <Button type="button" variant="outline" size="lg" onClick={onCancel} disabled={isSubmitting} className="w-full rounded-xl sm:w-auto">
          {cancelLabel}
        </Button>
      )}
      <Button type={submitType} variant="gradient" size="lg" onClick={onSubmit} disabled={isSubmitting || submitDisabled} aria-describedby={submitAriaDescribedBy} className="w-full min-w-32 rounded-xl sm:w-auto">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : submitIcon}
        {isSubmitting ? submittingLabel : submitLabel}
      </Button>
    </div>
  )
}
