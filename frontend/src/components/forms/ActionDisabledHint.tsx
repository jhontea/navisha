interface ActionDisabledHintProps {
  id: string
  reason: string | null
  className?: string
}

export function ActionDisabledHint({
  id,
  reason,
  className = "",
}: ActionDisabledHintProps) {
  if (!reason) return null

  return (
    <p
      id={id}
      role="status"
      aria-live="polite"
      className={`text-xs text-muted-foreground ${className}`}
    >
      {reason}
    </p>
  )
}
