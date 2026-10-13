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

export interface ToastAction {
  label: string
  onClick: () => void
}

/**
 * Show a toast. With `action` (e.g. Undo) the toast gets a button; clicking
 * it runs the action and closes the toast. Returns a handle to close it early.
 */
export function toast(
  message: string,
  kind: ToastKind = "info",
  durationMs = 3500,
  action?: ToastAction,
): { dismiss: () => void } {
  if (typeof document === "undefined") return { dismiss: () => {} }
  const host = getContainer()
  const el = document.createElement("div")
  el.className = `navisha-toast ${KIND_STYLES[kind]}`
  el.setAttribute("role", "status")

  let closed = false
  const dismiss = () => {
    if (closed) return
    closed = true
    window.clearTimeout(timer)
    el.style.opacity = "0"
    el.style.transform = "translateY(8px) scale(0.98)"
    window.setTimeout(() => el.remove(), 200)
  }

  const text = document.createElement("span")
  text.textContent = message
  el.appendChild(text)
  if (action) {
    el.classList.add("navisha-toast-with-action")
    const button = document.createElement("button")
    button.type = "button"
    button.className = "navisha-toast-action"
    button.textContent = action.label
    button.addEventListener("click", () => {
      action.onClick()
      dismiss()
    })
    el.appendChild(button)
  }

  host.appendChild(el)
  requestAnimationFrame(() => {
    el.style.opacity = "1"
    el.style.transform = "translateY(0) scale(1)"
  })
  const timer = window.setTimeout(dismiss, durationMs)
  return { dismiss }
}
