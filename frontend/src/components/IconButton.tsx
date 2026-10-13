import * as React from "react"

import { Button } from "@/components/ui/button"

type ButtonProps = React.ComponentProps<typeof Button>

type Props = Omit<ButtonProps, "size" | "children" | "aria-label"> & {
  /** Required: icon-only buttons have no visible text. */
  label: string
  icon: React.ReactNode
  size?: "default" | "sm" | "xs"
}

const SIZE = { default: "icon", sm: "icon-sm", xs: "icon-xs" } as const

/**
 * Icon-only button with a mandatory accessible label. Default size is a 44px
 * touch target (40px from md up).
 */
export const IconButton = React.forwardRef<HTMLButtonElement, Props>(
  ({ label, icon, size = "default", variant = "ghost", title, ...props }, ref) => (
    <Button
      ref={ref}
      variant={variant}
      size={SIZE[size]}
      aria-label={label}
      title={title ?? label}
      {...props}
    >
      {icon}
    </Button>
  ),
)
IconButton.displayName = "IconButton"
