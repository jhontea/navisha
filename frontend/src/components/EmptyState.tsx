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
        className="inline-flex items-center rounded-xl bg-gradient-to-r from-chromatic-sunset to-chromatic-sunset-end px-8 py-3 text-sm font-semibold text-white shadow-md shadow-chromatic-sunset/20 transition-all hover:shadow-lg hover:shadow-chromatic-sunset/30 active:scale-95"
      >
        {actionLabel}
      </Link>
    ) : onAction ? (
      <button
        onClick={onAction}
        className="inline-flex items-center rounded-xl bg-gradient-to-r from-chromatic-sunset to-chromatic-sunset-end px-8 py-3 text-sm font-semibold text-white shadow-md shadow-chromatic-sunset/20 transition-all hover:shadow-lg hover:shadow-chromatic-sunset/30 active:scale-95"
      >
        {actionLabel}
      </button>
    ) : null);

  if (isLarge) {
    return (
      <div
        className={`glass flex flex-col items-center justify-center rounded-3xl py-24 text-center ${className}`}
      >
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white/10">
          <MaterialIcon name={icon} size={48} className="text-muted-foreground" />
        </div>
        <h2 className="text-headline-md font-heading text-foreground mb-2">
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
      className={`glass rounded-xl p-6 text-center text-sm text-muted-foreground ${className}`}
    >
      <p>{description ?? title}</p>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
