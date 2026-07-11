import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  SCRATCH_HMAC_PREFIX,
  hashScratchCodeHmac,
  verifyScratchCodeHmac,
} from '../src/scratch-pepper';

const pepper = randomBytes(32);

describe('hashScratchCodeHmac / verifyScratchCodeHmac (ADR-007)', () => {
  it('round-trips and is deterministic under one pepper', () => {
    const hash = hashScratchCodeHmac('V3AZ3N0TRACE', pepper);
    expect(hash.startsWith(SCRATCH_HMAC_PREFIX)).toBe(true);
    expect(hash).toBe(hashScratchCodeHmac('V3AZ3N0TRACE', pepper));
    expect(verifyScratchCodeHmac('V3AZ3N0TRACE', hash, pepper)).toBe(true);
  });

  it('rejects wrong codes, wrong peppers and foreign hash formats', () => {
    const hash = hashScratchCodeHmac('V3AZ3N0TRACE', pepper);
    expect(verifyScratchCodeHmac('V3AZ3N0TRACX', hash, pepper)).toBe(false);
    expect(verifyScratchCodeHmac('V3AZ3N0TRACE', hash, randomBytes(32))).toBe(false);
    expect(verifyScratchCodeHmac('V3AZ3N0TRACE', '$argon2id$whatever', pepper)).toBe(false);
  });

  it('never embeds the code or pepper in the stored value', () => {
    const hash = hashScratchCodeHmac('V3AZ3N0TRACE', pepper);
    expect(hash).not.toContain('V3AZ3N0TRACE');
    expect(hash).not.toContain(pepper.toString('hex'));
  });

  it('refuses weak peppers', () => {
    expect(() => hashScratchCodeHmac('V3AZ3N0TRACE', randomBytes(16))).toThrow(/32 bytes/);
  });
});
