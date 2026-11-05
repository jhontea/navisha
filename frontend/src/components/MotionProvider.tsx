"use client"

import { LazyMotion, MotionConfig } from "motion/react"

const loadFeatures = () => import("@/lib/motionFeatures").then((mod) => mod.default)

/**
 * The one motion setup for the dashboard, mounted in app/(dashboard)/layout.tsx.
 * Components use `m.*` only; `strict` throws on a full `motion.*` component.
 * reducedMotion="user" stops transforms, not height/opacity, so lists also read
 * useReducedMotion() and set duration 0.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}
