/**
 * Per-tenant Ed25519 code signing (PROJECT_PLAN §2.4).
 *
 * The QR URL carries a truncated signature (`sig` query param, 16 base64url
 * chars = 96 bits); the server performs full signature verification. Ed25519
 * is deterministic, so the server can also recompute and compare truncated
 * signatures with the tenant's private key.
 *
 * Canonical message encoding (ADR-001 in docs/ARCHITECTURE.md):
 *   "veazen.code.v1:" + serial + ":" + tenant_id + ":" + batch_id   (UTF-8)
 * The domain-separation prefix and ':' delimiters make the encoding
 * unambiguous and versioned; none of the fields may contain ':'.
 */

import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign as edSign,
  timingSafeEqual,
  verify as edVerify,
  type KeyObject,
} from 'node:crypto';

export const SIGNATURE_CONTEXT = 'veazen.code.v1';
export const TRUNCATED_SIG_LENGTH = 16; // base64url chars → 96 bits

/** Raw key material as stored per tenant (private key gets envelope-encrypted). */
export interface Ed25519KeyPair {
  /** 32-byte raw public key */
  publicKey: Buffer;
  /** 32-byte private key seed */
  privateKey: Buffer;
}

export interface CodeSignatureInput {
  serial: string;
  tenantId: string;
  batchId: string;
}

// DER prefixes for wrapping raw Ed25519 key material (RFC 8410)
const PKCS8_ED25519_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');
const SPKI_ED25519_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

export function generateKeyPair(): Ed25519KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return {
    publicKey: (publicKey.export({ format: 'der', type: 'spki' }) as Buffer).subarray(-32),
    privateKey: (privateKey.export({ format: 'der', type: 'pkcs8' }) as Buffer).subarray(-32),
  };
}

export function privateKeyFromSeed(seed: Buffer): KeyObject {
  if (seed.length !== 32) {
    throw new Error(`Ed25519 private key seed must be 32 bytes, got ${seed.length}`);
  }
  return createPrivateKey({
    key: Buffer.concat([PKCS8_ED25519_PREFIX, seed]),
    format: 'der',
    type: 'pkcs8',
  });
}

export function publicKeyFromRaw(raw: Buffer): KeyObject {
  if (raw.length !== 32) {
    throw new Error(`Ed25519 public key must be 32 bytes, got ${raw.length}`);
  }
  return createPublicKey({
    key: Buffer.concat([SPKI_ED25519_PREFIX, raw]),
    format: 'der',
    type: 'spki',
  });
}

/** Derive the 32-byte raw public key from a 32-byte private key seed. */
export function publicKeyFromSeed(seed: Buffer): Buffer {
  const pub = createPublicKey(privateKeyFromSeed(seed));
  return (pub.export({ format: 'der', type: 'spki' }) as Buffer).subarray(-32);
}

/** Canonical signing message (ADR-001). */
export function buildCodeMessage(input: CodeSignatureInput): Buffer {
  for (const [field, value] of Object.entries(input)) {
    if (value.length === 0 || value.includes(':')) {
      throw new Error(`Invalid ${field} for signature message: ${JSON.stringify(value)}`);
    }
  }
  return Buffer.from(
    `${SIGNATURE_CONTEXT}:${input.serial}:${input.tenantId}:${input.batchId}`,
    'utf8',
  );
}

/** Full signature, base64url (no padding), 86 chars. */
export function signCode(input: CodeSignatureInput, privateKeySeed: Buffer): string {
  const signature = edSign(null, buildCodeMessage(input), privateKeyFromSeed(privateKeySeed));
  return signature.toString('base64url');
}

/** Truncated signature for the QR URL `sig` param (first 16 base64url chars). */
export function truncatedSig(fullSig: string): string {
  if (fullSig.length < TRUNCATED_SIG_LENGTH) {
    throw new Error('Full signature is shorter than the truncation length');
  }
  return fullSig.slice(0, TRUNCATED_SIG_LENGTH);
}

/** Full Ed25519 verification with the tenant's raw public key. */
export function verifyCodeSignature(
  input: CodeSignatureInput,
  fullSig: string,
  publicKeyRaw: Buffer,
): boolean {
  // Buffer.from silently drops invalid base64url characters, so a strict
  // length check is the gate against malformed input.
  const signature = Buffer.from(fullSig, 'base64url');
  if (signature.length !== 64) {
    return false;
  }
  return edVerify(null, buildCodeMessage(input), publicKeyFromRaw(publicKeyRaw), signature);
}

/**
 * Server-side check of a truncated `sig` param: recompute the deterministic
 * signature with the tenant private key and compare in constant time.
 */
export function verifyTruncatedSig(
  input: CodeSignatureInput,
  candidate: string,
  privateKeySeed: Buffer,
): boolean {
  // Gate on UTF-8 byte length, not string length: timingSafeEqual requires
  // equal buffer sizes, and a 16-char candidate with multi-byte characters
  // would otherwise throw instead of returning false.
  const candidateBytes = Buffer.from(candidate, 'utf8');
  if (candidateBytes.length !== TRUNCATED_SIG_LENGTH) {
    return false;
  }
  const expected = truncatedSig(signCode(input, privateKeySeed));
  return timingSafeEqual(Buffer.from(expected, 'utf8'), candidateBytes);
}
