import { tokenStore } from "./auth-token";

const fallbackApiUrl = "http://localhost:8090/api/v1";

export const apiConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? fallbackApiUrl,
};

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { params, signal, ...init } = options;
  const url = new URL(`${apiConfig.baseUrl}${path}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const accessToken = await tokenStore.getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(url.toString(), {
    ...init,
    headers,
    signal: signal ?? null,
  });

  if (!res.ok) {
    throw await buildApiError(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

async function buildApiError(res: Response): Promise<ApiError> {
  let code = "UNKNOWN_ERROR";
  let message = `HTTP ${res.status}`;

  try {
    const body = await res.json();
    const payload = body.message ?? body;

    if (typeof payload === "object" && payload !== null) {
      code = payload.code ?? body.code ?? code;
      message = payload.message ?? body.error ?? message;
    } else if (typeof payload === "string") {
      message = payload;
      code = body.code ?? code;
    }
  } catch {}

  return new ApiError(res.status, code, message);
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
};
