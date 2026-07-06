// ponytail: minimal toast — plain DOM, no library, no React state.
// Shows a transient message at the top-center of the viewport and
// auto-dismisses after a few seconds. Safe to call from anywhere
// (api.ts, hooks, components). Idempotent container.

type ToastKind = "info" | "error"

let container: HTMLDivElement | null = null

function getContainer(): HTMLDivElement {
  if (container && document.body.contains(container)) return container
  container = document.createElement("div")
  container.setAttribute("role", "alert")
  container.style.cssText =
    "position:fixed;top:1rem;left:50%;transform:translateX(-50%);z-index:9999;" +
    "display:flex;flex-direction:column;gap:0.5rem;align-items:center;" +
    "pointer-events:none;max-width:calc(100vw - 2rem);"
  document.body.appendChild(container)
  return container
}

const KIND_STYLES: Record<ToastKind, string> = {
  info: "background:hsl(var(--primary)/0.95);color:hsl(var(--primary-foreground));",
  error: "background:hsl(var(--destructive)/0.95);color:hsl(var(--destructive-foreground));",
}

export function toast(message: string, kind: ToastKind = "info", durationMs = 3500): void {
  if (typeof document === "undefined") return
  const host = getContainer()
  const el = document.createElement("div")
  el.textContent = message
  el.style.cssText =
    "pointer-events:auto;padding:0.7rem 1.1rem;border-radius:0.75rem;" +
    "font-size:0.875rem;font-weight:500;font-family:inherit;" +
    `box-shadow:0 8px 24px rgba(0,0,0,0.12),0 2px 8px rgba(0,0,0,0.06);` +
    "opacity:0;transform:translateY(-8px);transition:opacity 180ms ease,transform 180ms ease;" +
    KIND_STYLES[kind]
  host.appendChild(el)
  requestAnimationFrame(() => {
    el.style.opacity = "1"
    el.style.transform = "translateY(0)"
  })
  window.setTimeout(() => {
    el.style.opacity = "0"
    el.style.transform = "translateY(-8px)"
    window.setTimeout(() => el.remove(), 200)
  }, durationMs)
}