"use client"

import { useRef, useState } from "react"
import { useIsPresent } from "motion/react"
import * as m from "motion/react-m"

const EASE_SOFT = [0.2, 0.8, 0.2, 1] as const

/**
 * An AnimatePresence child that grows from / shrinks to height 0 while it fades.
 * Padding and gaps belong on an inner element so height 0 really is 0. It clips only
 * while moving, so focus rings and shadows show at rest (state, not transitionEnd:
 * transitionEnd did not land for rows mounted by a save in dev). overflow-clip, not
 * hidden, so it is no scroll container for flashRow's scrollIntoView.
 */
export function Collapse({
  as,
  rowId,
  instant,
  children,
}: {
  as?: "li"
  rowId?: string
  /** No animation, e.g. while a list is being dragged. */
  instant?: boolean
  children: React.ReactNode
}) {
  // MotionConfig reducedMotion="user" leaves height/opacity running, so stop them here.
  // Read on every render, not useReducedMotion(): that one keeps its mount-time value,
  // so a setting changed mid-session would still animate. Every animation starts from a
  // render (mount or present flipping), so this value is current when it is used.
  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  // While exiting, a moved row's old copy still carries its data-row-id; flashRow skips it.
  const present = useIsPresent()
  const [moving, setMoving] = useState(false)
  // One ref serves both tags.
  const ref = useRef<HTMLLIElement & HTMLDivElement>(null)
  const Tag = as === "li" ? m.li : m.div
  const finish = () => {
    setMoving(false)
    if (!present) return
    // flashRow scrolled while this was still short; reach the row now it has full height.
    const el = ref.current
    const flashed = el?.matches("[data-flash]") ? el : el?.querySelector("[data-flash]")
    flashed?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" })
  }
  return (
    <Tag
      ref={ref}
      data-row-id={rowId}
      data-exiting={present ? undefined : ""}
      // A leaving copy takes no focus or clicks (its menu would act on a deleted row).
      inert={!present}
      className={moving ? "overflow-clip" : undefined}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: reduce || instant ? 0 : 0.25, ease: EASE_SOFT }}
      onAnimationStart={() => setMoving(true)}
      onAnimationComplete={finish}
    >
      {children}
    </Tag>
  )
}
