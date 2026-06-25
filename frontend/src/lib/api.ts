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

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...init } = options

  const url = new URL(`${API_BASE}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  const res = await fetch(url.toString(), {
    ...init,
    credentials: "include", // always send cookies
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
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
