// MaterialIcon renders a Google Material Symbols icon.
// Centralized here to avoid duplicating this component across feature slices.
export function MaterialIcon({
  name,
  size = 24,
  className = "",
}: {
  name: string
  size?: number
  className?: string
}) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontSize: size }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
