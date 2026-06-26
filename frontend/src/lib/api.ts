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

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...init } = options

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

  const res = await fetch(url.toString(), {
    ...init,
    credentials: "include", // always send cookies
    headers,
  })

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
