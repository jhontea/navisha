import { createElement } from "react"
import type { LucideProps } from "lucide-react"

import { transportIcon } from "../lib/transportType"

/**
 * Icon for a transport type. The lookup returns one of the static lucide
 * icons, so wrapping it here keeps component selection out of render
 * (react-hooks/static-components).
 */
export function TransportIcon({ type, ...props }: { type: string | undefined } & LucideProps) {
  return createElement(transportIcon(type), props)
}
