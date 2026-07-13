import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Lemon Squeezy webhook signature check: the `X-Signature` header carries
 * `hex(HMAC-SHA256(secret, raw_request_body))`. Verification MUST run over
 * the raw bytes (main.ts boots Nest with `rawBody: true`) — re-serialized
 * JSON would not round-trip. Constant-time comparison via timingSafeEqual.
 */
export function verifyLemonSignature(
  rawBody: Buffer | undefined,
  signatureHeader: string | undefined,
  secret: string | null,
): boolean {
  if (!secret || !rawBody || !signatureHeader) {
    return false;
  }
  const expected = Buffer.from(
    createHmac('sha256', secret).update(rawBody).digest('hex'),
    'utf8',
  );
  const provided = Buffer.from(signatureHeader.trim().toLowerCase(), 'utf8');
  if (provided.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(provided, expected);
}
