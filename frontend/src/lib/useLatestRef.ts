import { useLayoutEffect, useRef } from "react"

/**
 * A ref that always holds the latest `value`, updated after render instead of
 * during it. Lets effects and event handlers call the newest callback without
 * listing it as a dependency (parents often pass inline closures).
 */
export function useLatestRef<T>(value: T) {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}
