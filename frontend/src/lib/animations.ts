/**
 * Animation utilities — staggered reveals, scroll-driven, micro-interactions.
 * No external dependencies required.
 */

/** Stagger delay helper — returns an inline style with animation-delay.
 *  Usage: <div style={stagger(0)}>  <div style={stagger(1)}>  ...
 *  Each step delays by 50ms. */
export function stagger(index: number, baseMs = 50): React.CSSProperties {
  return {
    animationDelay: `${index * baseMs}ms`,
    animationFillMode: "both",
  }
}

/** Fade-up entrance with stagger support.
 *  Combine with Tailwind: className="animate-fade-up" */
export const fadeUpClass = "animate-fade-up"

/** Card entrance — slightly larger translate for card cascades. */
export const cardEntranceClass = "animate-fade-up"

/** Hover scale — subtle lift on interactive cards/buttons. */
export const hoverLiftClass =
  "transition-all duration-300 hover:-translate-y-1 hover:shadow-chromatic"

/** Button press feedback — scale down on active. */
export const pressClass = "active:scale-[0.97] transition-transform duration-150"
