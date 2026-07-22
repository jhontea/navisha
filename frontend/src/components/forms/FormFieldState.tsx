import type { ReactNode } from "react"
import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface FormFieldLabelProps {
  children: ReactNode
  id?: string
  htmlFor?: string
  required?: boolean
  optional?: boolean
  className?: string
}

export function FormFieldLabel({
  children,
  id,
  htmlFor,
  required,
  optional,
  className,
}: FormFieldLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      id={id}
      className={cn("font-label-md text-muted-foreground", className)}
    >
      {children}
      {required && (
        <>
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
          <span className="sr-only"> required</span>
        </>
      )}
      {optional && (
        <span className="ml-1 font-normal normal-case tracking-normal text-xs text-muted-foreground/70">
          (optional)
        </span>
      )}
    </label>
  )
}

export function FormFieldDescription({
  id,
  children,
  className,
}: {
  id?: string
  children: ReactNode
  className?: string
}) {
  return (
    <p id={id} className={cn("text-xs leading-relaxed text-muted-foreground", className)}>
      {children}
    </p>
  )
}

export function FormFieldError({
  id,
  children,
  className,
}: {
  id?: string
  children?: ReactNode
  className?: string
}) {
  if (!children) return null

  return (
    <p
      id={id}
      role="alert"
      className={cn("flex items-start gap-1.5 text-xs leading-relaxed text-destructive", className)}
    >
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

export function fieldDescriptionIds(
  descriptionId: string | undefined,
  errorId: string | undefined,
  hasError: boolean,
) {
  return [descriptionId, hasError ? errorId : undefined].filter(Boolean).join(" ") || undefined
}
