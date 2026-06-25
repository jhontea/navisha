"use client";

import Link from "next/link";
import { MaterialIcon } from "@/components/MaterialIcon";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  /** Use "large" for full-page empty states, "compact" for section-level. */
  size?: "large" | "compact";
  className?: string;
}

/** Standardized empty state with icon, title, description, and optional CTA.
 *  Phase 3A: replaces 6+ ad-hoc empty states across the app. */
export function EmptyState({
  icon = "map",
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  size = "compact",
  className = "",
}: EmptyStateProps) {
  const isLarge = size === "large";

  const cta = actionLabel &&
    (actionHref ? (
      <Link
        href={actionHref}
        className="bg-primary text-on-primary px-8 py-3 rounded-xl font-label-md text-label-md hover:opacity-90 transition-all active:scale-95 inline-flex items-center"
      >
        {actionLabel}
      </Link>
    ) : onAction ? (
      <button
        onClick={onAction}
        className="bg-primary text-on-primary px-8 py-3 rounded-xl font-label-md text-label-md hover:opacity-90 transition-all active:scale-95"
      >
        {actionLabel}
      </button>
    ) : null);

  if (isLarge) {
    return (
      <div
        className={`flex flex-col items-center justify-center py-24 text-center bg-surface-container-low rounded-3xl border-2 border-dashed border-outline-variant ${className}`}
      >
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-surface-container-high">
          <MaterialIcon name={icon} size={48} className="text-outline" />
        </div>
        <h2 className="text-headline-md font-headline-md text-on-surface mb-2">
          {title}
        </h2>
        {description && (
          <p className="text-body-md font-body-md text-on-surface-variant mb-8 max-w-sm">
            {description}
          </p>
        )}
        {cta}
      </div>
    );
  }

  // Compact variant
  return (
    <div
      className={`rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground ${className}`}
    >
      <p>{description ?? title}</p>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
