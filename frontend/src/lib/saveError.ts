import { ApiError, isOfflineError } from "@/lib/api"

export const SAVE_ERROR_MESSAGE = "Couldn't save. Check your connection and try again."

/**
 * The message to show when a write fails, or null when the user was already
 * told: offline and an expired session (401) are toasted by api.ts, and
 * LOGGING_OUT is an intentional sign-out. 4xx messages come from the server
 * and say what to fix; anything else gets the generic retry message.
 */
export function saveErrorMessage(err: unknown): string | null {
  if (isOfflineError(err)) return null
  if (err instanceof ApiError && (err.status === 401 || err.code === "LOGGING_OUT")) return null
  if (err instanceof ApiError && err.status >= 400 && err.status < 500) return err.message
  return SAVE_ERROR_MESSAGE
}

declare module "@tanstack/react-query" {
  interface Register {
    // handlesError: the caller shows its own error, so the global toast skips it.
    mutationMeta: { handlesError?: boolean }
  }
}
