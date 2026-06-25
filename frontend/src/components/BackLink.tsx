"use client";

import Link from "next/link";

export type BackLinkVariant = "default" | "subtle" | "primary";

interface BackLinkProps {
  href: string;
  /** Defaults to "Back to Home" */
  label?: string;
  /** Visual variant. default=inline-flex with muted color, subtle=plain text,
   *  primary=colored with underline. */
  variant?: BackLinkVariant;
  className?: string;
}

const variantStyles: Record<BackLinkVariant, string> = {
  default:
    "inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors",
  subtle: "text-sm text-muted-foreground hover:text-primary transition-colors",
  primary:
    "inline-block text-sm text-primary hover:underline",
};

/** Consistent back-navigation link. Phase 3A: replaces 10+ duplicated
 *  inline SVG + Link patterns across the app. */
export function BackLink({
  href,
  label = "Back to Home",
  variant = "default",
  className = "",
}: BackLinkProps) {
  return (
    <Link href={href} className={`${variantStyles[variant]} ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={variant === "subtle" ? "inline" : ""}
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
      {variant === "subtle" ? " " : ""}
      {label}
    </Link>
  );
}
