import type { ApiResponse, ApiSuccess } from '@rootlink/shared';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

// ─── Token storage ─────────────────────────────────────────────────────────

let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

// ─── Error class ───────────────────────────────────────────────────────────

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// ─── Refresh token logic ───────────────────────────────────────────────────

let _isRefreshing = false;
let _refreshQueue: Array<(token: string) => void> = [];

async function refreshAccessToken(): Promise<string> {
  // The refresh token lives in an httpOnly cookie set by the API on
  // login/refresh — it is never readable from JavaScript, so there is
  // nothing to read from localStorage here. `credentials: 'include'`
  // ensures the cookie is sent with this same-site request.
  const response = await fetch(`${API_BASE}/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    setAccessToken(null);
    window.location.href = '/login';
    throw new ApiClientError(401, 'AUTH_003', 'Session expired');
  }

  const data = (await response.json()) as ApiSuccess<{
    accessToken: string;
    expiresIn: string;
  }>;

  setAccessToken(data.data.accessToken);
  return data.data.accessToken;
}

// ─── Core fetch wrapper ────────────────────────────────────────────────────

interface FetchOptions extends RequestInit {
  idempotencyKey?: string;
  skipAuth?: boolean;
}

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { idempotencyKey, skipAuth, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');

  if (!skipAuth && _accessToken) {
    headers.set('Authorization', `Bearer ${_accessToken}`);
  }

  if (idempotencyKey) {
    headers.set('X-Idempotency-Key', idempotencyKey);
  }

  let response = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  });

  // ─── Auto-refresh on 401 ──────────────────────────────────────────────────

  if (response.status === 401 && !skipAuth) {
    if (_isRefreshing) {
      // Queue this request until refresh completes
      const newToken = await new Promise<string>((resolve) => {
        _refreshQueue.push(resolve);
      });
      headers.set('Authorization', `Bearer ${newToken}`);
      response = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers, credentials: 'include' });
    } else {
      _isRefreshing = true;
      try {
        const newToken = await refreshAccessToken();
        _refreshQueue.forEach((resolve) => resolve(newToken));
        _refreshQueue = [];
        headers.set('Authorization', `Bearer ${newToken}`);
        response = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers, credentials: 'include' });
      } finally {
        _isRefreshing = false;
      }
    }
  }

  // ─── Parse response ───────────────────────────────────────────────────────

  let body: ApiResponse<T>;
  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiClientError(response.status, 'SRV_001', 'Invalid response from server');
  }

  if (!body.success) {
    throw new ApiClientError(
      response.status,
      body.error.code,
      body.error.message,
      body.error.details as Record<string, unknown> | undefined,
    );
  }

  return (body as ApiSuccess<T>).data;
}

// ─── Typed API helpers ─────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string, options?: FetchOptions) =>
    apiFetch<T>(path, { method: 'GET', ...options }),

  post: <T>(path: string, body: unknown, options?: FetchOptions) =>
    apiFetch<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    }),

  patch: <T>(path: string, body: unknown, options?: FetchOptions) =>
    apiFetch<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
      ...options,
    }),

  delete: <T = void>(path: string, options?: FetchOptions) =>
    apiFetch<T>(path, { method: 'DELETE', ...options }),
};
