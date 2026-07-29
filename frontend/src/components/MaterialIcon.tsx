import { ArrowLeftRight, History, X } from "lucide-react"

const ICONS = {
  swap_horiz: ArrowLeftRight,
  history: History,
  close: X,
} as const

// Compatibility wrapper for call sites that used Material Symbols names.
// Local SVGs avoid loading the multi-megabyte icon webfont.
export function MaterialIcon({
  name,
  size = 24,
  className = "",
}: {
  name: string
  size?: number
  className?: string
}) {
  const Icon = ICONS[name as keyof typeof ICONS] ?? X

  return (
    <Icon
      className={className}
      width={size}
      height={size}
      aria-hidden="true"
    />
  )
}
