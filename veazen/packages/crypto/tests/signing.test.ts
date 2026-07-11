import { sign as edSign } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  SIGNATURE_CONTEXT,
  TRUNCATED_SIG_LENGTH,
  buildCodeMessage,
  generateKeyPair,
  privateKeyFromSeed,
  publicKeyFromRaw,
  publicKeyFromSeed,
  signCode,
  truncatedSig,
  verifyCodeSignature,
  verifyTruncatedSig,
} from '../src/signing';
import vectors from '../test-vectors/vectors.json';

// RFC 8032 §7.1 TEST 1 — independent validation of the raw-seed ⇄ DER plumbing
const RFC8032_SEED = Buffer.from(
  '9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60',
  'hex',
);
const RFC8032_PUBLIC = 'd75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a';
const RFC8032_SIG_EMPTY_MSG =
  'e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e06522490155' +
  '5fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b';

describe('Ed25519 plumbing against RFC 8032 test vectors', () => {
  it('derives the RFC 8032 public key from the seed', () => {
    expect(publicKeyFromSeed(RFC8032_SEED).toString('hex')).toBe(RFC8032_PUBLIC);
  });

  it('produces the RFC 8032 signature for the empty message', () => {
    const sig = edSign(null, Buffer.alloc(0), privateKeyFromSeed(RFC8032_SEED));
    expect(sig.toString('hex')).toBe(RFC8032_SIG_EMPTY_MSG);
  });
});

describe('buildCodeMessage', () => {
  it('uses the versioned, domain-separated canonical encoding (ADR-001)', () => {
    const message = buildCodeMessage({
      serial: 'A1B2CD3E4F6H7J8K9M0N',
      tenantId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      batchId: '11111111-2222-3333-4444-555555555555',
    });
    expect(message.toString('utf8')).toBe(
      `${SIGNATURE_CONTEXT}:A1B2CD3E4F6H7J8K9M0N:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee:11111111-2222-3333-4444-555555555555`,
    );
  });

  it('rejects empty fields and fields containing the delimiter', () => {
    const base = { serial: 'A1B2C', tenantId: 't-1', batchId: 'b-1' };
    expect(() => buildCodeMessage({ ...base, serial: '' })).toThrow(/Invalid serial/);
    expect(() => buildCodeMessage({ ...base, tenantId: 'a:b' })).toThrow(/Invalid tenantId/);
  });
});

describe('signCode / verifyCodeSignature / truncation', () => {
  it('matches the committed test vectors', () => {
    for (const v of vectors.ed25519) {
      const seed = Buffer.from(v.privateKeySeedHex, 'hex');
      expect(publicKeyFromSeed(seed).toString('hex')).toBe(v.publicKeyHex);
      const input = { serial: v.serial, tenantId: v.tenantId, batchId: v.batchId };
      const sig = signCode(input, seed);
      expect(sig).toBe(v.sig);
      expect(truncatedSig(sig)).toBe(v.sigTruncated);
      expect(verifyCodeSignature(input, sig, Buffer.from(v.publicKeyHex, 'hex'))).toBe(true);
      expect(verifyTruncatedSig(input, v.sigTruncated, seed)).toBe(true);
    }
  });

  it('signs and verifies with freshly generated tenant keys', () => {
    const { publicKey, privateKey } = generateKeyPair();
    expect(publicKey).toHaveLength(32);
    expect(privateKey).toHaveLength(32);
    expect(publicKeyFromSeed(privateKey).equals(publicKey)).toBe(true);

    const input = {
      serial: 'A1B2CD3E4F6H7J8K9M0N',
      tenantId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      batchId: '11111111-2222-3333-4444-555555555555',
    };
    const sig = signCode(input, privateKey);
    expect(verifyCodeSignature(input, sig, publicKey)).toBe(true);
    // any tampering must break verification
    expect(verifyCodeSignature({ ...input, serial: 'A1B2CD3E4F6H7J8K9M00' }, sig, publicKey)).toBe(
      false,
    );
    expect(verifyCodeSignature(input, sig, generateKeyPair().publicKey)).toBe(false);
  });

  it('rejects malformed full signatures by length', () => {
    const { publicKey, privateKey } = generateKeyPair();
    const input = { serial: 'A1B2C', tenantId: 't-1', batchId: 'b-1' };
    expect(verifyCodeSignature(input, 'not-base64url-!!', publicKey)).toBe(false);
    expect(verifyCodeSignature(input, signCode(input, privateKey).slice(0, 20), publicKey)).toBe(
      false,
    );
  });

  it('verifies truncated signatures in constant time, rejecting bad candidates', () => {
    const { privateKey } = generateKeyPair();
    const input = { serial: 'A1B2C', tenantId: 't-1', batchId: 'b-1' };
    const good = truncatedSig(signCode(input, privateKey));
    expect(good).toHaveLength(TRUNCATED_SIG_LENGTH);
    expect(verifyTruncatedSig(input, good, privateKey)).toBe(true);
    expect(verifyTruncatedSig(input, 'x'.repeat(TRUNCATED_SIG_LENGTH), privateKey)).toBe(false);
    expect(verifyTruncatedSig(input, 'tooshort', privateKey)).toBe(false);
    // 16 chars but 17 UTF-8 bytes — must return false, not throw (RangeError guard)
    expect(verifyTruncatedSig(input, `é${'A'.repeat(15)}`, privateKey)).toBe(false);
    // 16 UTF-8 bytes from 15 chars — equal buffer sizes, must compare and reject
    expect(verifyTruncatedSig(input, `é${'A'.repeat(14)}`, privateKey)).toBe(false);
  });

  it('rejects truncation of signatures shorter than the truncation length', () => {
    expect(() => truncatedSig('short')).toThrow(/shorter than/);
  });

  it('rejects raw key material of the wrong length', () => {
    expect(() => privateKeyFromSeed(Buffer.alloc(31))).toThrow(/32 bytes/);
    expect(() => publicKeyFromRaw(Buffer.alloc(33))).toThrow(/32 bytes/);
  });
});
