import type { ReactNode } from "react"

import { FormFieldError, FormFieldLabel } from "./FormFieldState"

/** Label, control and error message for one form field. */
export function FormField({
  label,
  htmlFor,
  error,
  errorId,
  required,
  optional,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  errorId?: string
  required?: boolean
  optional?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <FormFieldLabel htmlFor={htmlFor} required={required} optional={optional}>
        {label}
      </FormFieldLabel>
      {children}
      <FormFieldError id={errorId}>{error}</FormFieldError>
    </div>
  )
}
