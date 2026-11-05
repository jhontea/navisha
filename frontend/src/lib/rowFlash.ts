/**
 * Briefly tint a list row after it is saved or brought back by Undo, so the
 * eye finds it (docs/DESIGN.md §6). Rows opt in with `data-row-id={id}` on the
 * element that carries their background; globals.css styles `[data-flash]`.
 *
 * The tint comes on at once, holds for FLASH_ON_MS, then fades over
 * FLASH_FADE_MS. With reduced motion the fade is instant (global rule), so the
 * row is simply tinted for a second.
 */

export const FLASH_ON_MS = 1000
export const FLASH_FADE_MS = 600
// A new row renders after the cache update, or not at all (filtered, other page).
const FIND_FOR_MS = 2000

const timers = new WeakMap<Element, ReturnType<typeof setTimeout>>()

export function flashRow(id: string) {
  if (typeof document === "undefined") return
  const until = Date.now() + FIND_FOR_MS
  const find = () => {
    // Ids are server UUIDs, safe inside the quoted selector.
    // Skip a copy that is animating out (an edited row that moved to another group).
    const el = [...document.querySelectorAll(`[data-row-id="${id}"]`)].find((e) => !e.closest("[data-exiting]"))
    if (el) light(el)
    else if (Date.now() < until) requestAnimationFrame(find)
  }
  // Wait for TanStack Query's notify (setTimeout 0) and then a frame, so an edited row
  // that moved (e.g. an expense whose date changed) has re-rendered before we find it.
  setTimeout(() => requestAnimationFrame(find), 0)
}

function light(el: Element) {
  clearTimeout(timers.get(el))
  // "on" has no transition, so a second flash during the fade re-tints at once.
  el.setAttribute("data-flash", "on")
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  el.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" })
  timers.set(
    el,
    setTimeout(() => {
      el.setAttribute("data-flash", "off")
      timers.set(el, setTimeout(() => el.removeAttribute("data-flash"), FLASH_FADE_MS))
    }, FLASH_ON_MS),
  )
}
