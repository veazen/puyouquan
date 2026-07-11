import { describe, expect, it } from 'vitest';

import * as veazenCrypto from '../src/index';

describe('package entry point', () => {
  it('exposes the full public API', () => {
    expect(veazenCrypto.SERIAL_LENGTH).toBe(20);
    expect(veazenCrypto.SCRATCH_LENGTH).toBe(12);
    expect(veazenCrypto.TRUNCATED_SIG_LENGTH).toBe(16);
    expect(veazenCrypto.DEFAULT_DISPLAY_GROUP_SIZE).toBe(5);
    for (const fn of [
      veazenCrypto.encodeCrockford,
      veazenCrypto.decodeCrockford,
      veazenCrypto.normalizeInput,
      veazenCrypto.formatForDisplay,
      veazenCrypto.isCanonicalCrockford,
      veazenCrypto.generateSerial,
      veazenCrypto.isValidSerial,
      veazenCrypto.generateKeyPair,
      veazenCrypto.buildCodeMessage,
      veazenCrypto.signCode,
      veazenCrypto.truncatedSig,
      veazenCrypto.verifyCodeSignature,
      veazenCrypto.verifyTruncatedSig,
      veazenCrypto.generateScratchCode,
      veazenCrypto.hashScratchCode,
      veazenCrypto.verifyScratchCode,
    ]) {
      expect(typeof fn).toBe('function');
    }
  });
});
