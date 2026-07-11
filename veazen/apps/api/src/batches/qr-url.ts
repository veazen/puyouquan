import { buildVerifyPath } from '@veazen/shared';

/** QR URL: GS1 Digital Link when a GTIN exists, /v/{serial} otherwise (§1.5). */
export function buildQrUrl(
  baseUrl: string,
  serial: string,
  sig: string,
  gtin?: string | null,
): string {
  const path = buildVerifyPath(serial, gtin ?? undefined);
  return `${baseUrl.replace(/\/$/, '')}${path}?sig=${encodeURIComponent(sig)}`;
}
