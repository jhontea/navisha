import { useSyncExternalStore } from "react"

import { toast } from "./toast"

/**
 * Delete with Undo (docs/PLANNING_REFACTOR_REDESIGN.md B5).
 *
 * The item disappears at once and a toast offers Undo. The server delete is
 * only sent when the toast times out, so Undo just cancels it: nothing has to
 * be recreated and ids, order and linked expenses stay intact. Lists hide
 * pending ids with `usePendingDeletes()`, which also survives refetches.
 *
 * Deletes still pending when the page is hidden or closed are sent right
 * away (api.delete uses fetch keepalive), so a delete is never lost.
 */

export const UNDO_WINDOW_MS = 6000

type Pending = { commit: () => Promise<unknown>; onError: () => void; timer: number; dismiss: () => void }

const pending = new Map<string, Pending>()
let snapshot: ReadonlySet<string> = new Set()
const listeners = new Set<() => void>()

function emit() {
  snapshot = new Set(pending.keys())
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const EMPTY: ReadonlySet<string> = new Set()

/** Ids hidden because their delete is waiting out the undo window. */
export function usePendingDeletes(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, () => snapshot, () => EMPTY)
}

function commit(id: string) {
  const item = pending.get(id)
  if (!item) return
  window.clearTimeout(item.timer)
  item.dismiss()
  item
    .commit()
    .catch(() => item.onError())
    // Keep the id hidden until the delete settles, so the list does not flash
    // the item back before the mutation removes it from the cache.
    .finally(() => {
      pending.delete(id)
      emit()
    })
}

function undo(id: string) {
  const item = pending.get(id)
  if (!item) return
  window.clearTimeout(item.timer)
  pending.delete(id)
  emit()
}

/**
 * Hide `id` now and delete it after the undo window.
 * `commit` performs the server delete; `errorMessage` is shown (and the item
 * comes back) if it fails.
 */
export function scheduleDelete({
  id,
  message,
  errorMessage,
  commit: run,
}: {
  id: string
  message: string
  errorMessage: string
  commit: () => Promise<unknown>
}) {
  if (typeof window === "undefined" || pending.has(id)) return
  ensureFlushOnHide()
  const { dismiss } = toast(message, "info", UNDO_WINDOW_MS, { label: "Undo", onClick: () => undo(id) })
  pending.set(id, {
    commit: run,
    onError: () => toast(errorMessage, "error"),
    timer: window.setTimeout(() => commit(id), UNDO_WINDOW_MS),
    dismiss,
  })
  emit()
}

/** Send every pending delete now (page hidden or closing). */
export function flushPendingDeletes() {
  Array.from(pending.keys()).forEach(commit)
}

let flushRegistered = false
function ensureFlushOnHide() {
  if (flushRegistered) return
  flushRegistered = true
  window.addEventListener("pagehide", flushPendingDeletes)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPendingDeletes()
  })
}
