// ponytail: minimal toast — plain DOM, no library, no React state.
// Shows a transient message at the top-center of the viewport and
// auto-dismisses after a few seconds. Safe to call from anywhere
// (api.ts, hooks, components). Idempotent container.

type ToastKind = "info" | "error"

let container: HTMLDivElement | null = null

function getContainer(): HTMLDivElement {
  if (container && document.body.contains(container)) return container
  container = document.createElement("div")
  container.className = "navisha-toast-container"
  container.setAttribute("role", "alert")
  document.body.appendChild(container)
  return container
}

const KIND_STYLES: Record<ToastKind, string> = {
  info: "navisha-toast-info",
  error: "navisha-toast-error",
}

export function toast(message: string, kind: ToastKind = "info", durationMs = 3500): void {
  if (typeof document === "undefined") return
  const host = getContainer()
  const el = document.createElement("div")
  el.className = `navisha-toast ${KIND_STYLES[kind]}`
  el.setAttribute("role", "status")
  el.textContent = message
  host.appendChild(el)
  requestAnimationFrame(() => {
    el.style.opacity = "1"
    el.style.transform = "translateY(0) scale(1)"
  })
  window.setTimeout(() => {
    el.style.opacity = "0"
    el.style.transform = "translateY(8px) scale(0.98)"
    window.setTimeout(() => el.remove(), 200)
  }, durationMs)
}
