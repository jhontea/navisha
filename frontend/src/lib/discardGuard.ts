/**
 * What closing a form sheet (X, Escape, backdrop) should do: close straight
 * away when nothing was typed, otherwise ask before throwing the input away.
 */
export function sheetCloseAction(isDirty: boolean): "close" | "confirm" {
  return isDirty ? "confirm" : "close"
}
