"use client"

import * as m from "motion/react-m"

/**
 * The tint behind a nav's active item. It renders inside the active item, so it is right
 * from the first frame, and slides from the previous item once motion's features load.
 * The item needs `relative` and the list `isolate`, not the item: the pill must stay behind
 * every label it slides past. The radius is a style, not a class, so motion can keep the
 * ends round while it scales between items of other widths.
 */
export function ActivePill({ layoutId }: { layoutId: string }) {
  return (
    <m.span
      layoutId={layoutId}
      aria-hidden="true"
      className="absolute inset-0 -z-10 bg-primary-soft"
      style={{ borderRadius: 9999 }}
      transition={{ type: "spring", visualDuration: 0.42, bounce: 0.15 }}
    />
  )
}
