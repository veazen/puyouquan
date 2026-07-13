'use client';

import { apiBase } from '../api';

/**
 * Dashboard API client (§6): JWT auth with transparent refresh.
 * Tokens live in localStorage — acceptable for the MVP console; revisit
 * (httpOnly cookie session) before public launch.
 */

const ACCESS_KEY = 'vz_access';
const REFRESH_KEY = 'vz_refresh';

export function getTokens(): { access: string | null; refresh: string | null } {
  if (typeof window === 'undefined') {
    return { access: null, refresh: null };
  }
  return {
    access: window.localStorage.getItem(ACCESS_KEY),
    refresh: window.localStorage.getItem(REFRESH_KEY),
  };
}

export function setTokens(access: string, refresh: string): void {
  window.localStorage.setItem(ACCESS_KEY, access);
  window.localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Console role from the access JWT's `role` claim (E1). Pure UI hint — the
 * API enforces the real matrix; no signature check needed here.
 */
export function getRole(): string | null {
  const { access } = getTokens();
  if (!access) {
    return null;
  }
  try {
    const payload = JSON.parse(
      atob(access.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/')),
    ) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

/** 403s become a human sentence instead of the raw guard message. */
export function friendlyMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) {
    return 'Your role has no permission for this — ask the account owner (403).';
  }
  return (error as Error).message;
}

async function tryRefresh(): Promise<boolean> {
  const { refresh } = getTokens();
  if (!refresh) {
    return false;
  }
  const res = await fetch(`${apiBase()}/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
  });
  if (!res.ok) {
    clearTokens();
    return false;
  }
  const body = (await res.json()) as { accessToken: string; refreshToken: string };
  setTokens(body.accessToken, body.refreshToken);
  return true;
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const attempt = async (): Promise<Response> => {
    const { access } = getTokens();
    return fetch(`${apiBase()}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(access ? { authorization: `Bearer ${access}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  };

  let res = await attempt();
  if (res.status === 401 && (await tryRefresh())) {
    res = await attempt();
  }
  if (res.status === 401) {
    window.location.href = '/dashboard/login';
    throw new ApiError(401, 'unauthorized');
  }
  if (!res.ok) {
    let message = `${res.status}`;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      message = Array.isArray(body.message) ? body.message.join('; ') : (body.message ?? message);
    } catch {
      /* keep status text */
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}
