import { toast } from "@/lib/toast"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8090/api/v1"

interface FetchOptions extends RequestInit {
  params?: Record<string, string>
}

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

/** Read the CSRF token from the non-HTTP-only csrf_token cookie. */
function getCSRFToken(): string {
  if (typeof document === "undefined") return ""
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ""
}

// ponytail: single-flight refresh — concurrent 401s all share one /auth/refresh call
let refreshInFlight: Promise<boolean> | null = null
async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
      return res.ok
    } catch {
      return false
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

// Set to true while the user is intentionally logging out so the 401 handler
// below doesn't mistake the cleared cookies for a session-expiry and toast/
// redirect. Call setLoggingOut(true) *before* the logout call; reset is
// optional — the page navigates away either way.
let isLoggingOut = false
export function setLoggingOut(value: boolean): void {
  isLoggingOut = value
}

// ponytail: guard against multiple 401s all toasting + redirecting at once
let bailing = false
/** Notify the user the session has expired, then bounce to /login. */
function bailToLoginOnError(): never {
  if (bailing) return new Promise<never>(() => {}) as never
  bailing = true
  if (typeof window !== "undefined") {
    toast("Your session has expired. Redirecting to login…", "info", 2500)
    // Let the toast paint before the reload so the user sees the message.
    window.setTimeout(() => {
      window.location.href = `/login?reason=session-expired`
    }, 1200)
  }
  // Block the rejected promise from resolving after the redirect fires.
  return new Promise<never>(() => {}) as never
}

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { params, signal, ...init } = options

  // ponytail: while the user is intentionally logging out, suppress all
  // other requests — cookies are about to be (or already are) gone, and any
  // fetch here would just 401 and pollute the console. The logout call itself
  // is exempt (path==="/auth/logout"). Pending TanStack queries get rejected
  // immediately, which is fine: clear() / unmount absorbs them.
  if (isLoggingOut && path !== "/auth/logout") {
    throw new ApiError(0, "LOGGING_OUT", "Session ending")
  }

  const url = new URL(`${API_BASE}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  // Include CSRF token in mutation requests (Double Submit Cookie pattern).
  const csrfToken = getCSRFToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  }
  if (csrfToken && init.method && init.method !== "GET") {
    headers["X-CSRF-Token"] = csrfToken
  }

  let res = await fetch(url.toString(), {
    ...init,
    cache: "no-store",
    credentials: "include",
    headers,
    signal: signal ?? null,
  })

  // ponytail: 401 → try /auth/refresh once, then retry the original request.
  // If refresh fails, the session is gone — surface it to the user instead of
  // silently failing. Skip for the /auth/refresh path itself to avoid recursion.
  // Skip when the user is intentionally logging out — those 401s are expected.
  if (res.status === 401 && path !== "/auth/refresh" && !isLoggingOut) {
    const ok = await refreshSession()
    if (ok) {
      // Replay the original request with fresh cookies.
      res = await fetch(url.toString(), {
        ...init,
        cache: "no-store",
        credentials: "include",
        headers,
        signal: signal ?? null,
      })
    } else {
      bailToLoginOnError()
    }
  }

  if (!res.ok) {
    let code = "UNKNOWN_ERROR"
    let message = `HTTP ${res.status}`
    try {
      const body = await res.json()
      // Echo wraps custom errors as { message: <payload> }. The payload may be
      // a plain string or an object { code, message }. Handle both, plus the
      // older { code, error } shape.
      const payload = body.message ?? body
      if (typeof payload === "object" && payload !== null) {
        code = payload.code ?? body.code ?? code
        message = payload.message ?? body.error ?? message
      } else if (typeof payload === "string") {
        message = payload
        code = body.code ?? code
      }
    } catch {}
    throw new ApiError(res.status, code, message)
  }


  // 204 No Content
  if (res.status === 204) return undefined as T

  return res.json()
}

export const api = {
  get: <T>(path: string, options?: FetchOptions) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: FetchOptions) =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown, options?: FetchOptions) =>
    request<T>(path, {
      ...options,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string, options?: FetchOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
}

export { ApiError }
