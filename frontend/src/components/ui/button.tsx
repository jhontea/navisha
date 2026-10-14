import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Navisha customization of the coss ui button (docs/DESIGN.md §5): pill
// shape, solid primary, a `soft` tint for secondary actions, a solid
// `danger`, and sizes that meet the 44px touch target on mobile.
const primary = "bg-primary text-primary-foreground hover:bg-primary/90"
const outline =
  "border-border bg-card text-foreground hover:bg-muted aria-expanded:bg-muted"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-bold whitespace-nowrap transition-colors duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: primary,
        outline,
        secondary: "bg-muted text-foreground hover:bg-muted/70 aria-expanded:bg-muted/70",
        soft: "bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft/70 aria-expanded:bg-primary-soft/70",
        /** Round button floating on a trip cover (always light, both themes). */
        cover:
          "bg-cover-button/90 text-cover-button-foreground shadow-card hover:bg-cover-button",
        ghost: "text-foreground hover:bg-muted aria-expanded:bg-muted",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/15 focus-visible:ring-destructive/40",
        danger:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/40",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        // 44px on touch layouts, 40px from md up.
        default: "h-11 gap-2 px-4 md:h-10",
        lg: "h-12 gap-2 px-5 text-base",
        sm: "h-9 gap-1.5 px-3",
        /** Dense desktop-only controls; prefer `sm` or `default`. */
        xs: "h-8 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        icon: "size-11 md:size-10",
        "icon-lg": "size-12",
        "icon-sm": "size-9",
        "icon-xs": "size-8 [&_svg:not([class*='size-'])]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef<
  HTMLButtonElement,
  ButtonPrimitive.Props & VariantProps<typeof buttonVariants>
>(({ className, variant = "default", size = "default", ...props }, ref) => {
  return (
    <ButtonPrimitive
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
