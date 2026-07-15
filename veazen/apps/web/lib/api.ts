import type { VerifyResponse } from '@veazen/shared';

/**
 * API base resolution:
 * - server (SSR verify page): API_URL_INTERNAL (cluster-internal), falling
 *   back to the public base
 * - browser (scratch form, dashboard): NEXT_PUBLIC_API_URL
 */
export function apiBase(): string {
  if (typeof window === 'undefined') {
    return (
      process.env.API_URL_INTERNAL ??
      process.env.NEXT_PUBLIC_API_URL ??
      'http://localhost:4000/api/v1'
    );
  }
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
}

/**
 * Browser-reachable API base for links rendered into server components
 * (e.g. the COA download link on the verify page, B1). API_URL_INTERNAL may
 * be cluster-internal, so consumer-facing hrefs must use the public base.
 */
export function publicApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
}

export async function fetchVerify(
  serial: string,
  sig?: string,
): Promise<VerifyResponse | null> {
  const url = `${apiBase()}/verify/${encodeURIComponent(serial)}${
    sig ? `?sig=${encodeURIComponent(sig)}` : ''
  }`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as VerifyResponse;
  } catch {
    return null;
  }
}
