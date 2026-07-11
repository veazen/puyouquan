import { describe, expect, it } from 'vitest';

import { isCanonicalCrockford } from '../src/format';
import {
  SERIAL_LENGTH,
  SERIAL_RANDOM_BYTES,
  generateSerial,
  isValidSerial,
} from '../src/serial';
import vectors from '../test-vectors/vectors.json';

describe('generateSerial', () => {
  it('matches the committed deterministic test vectors', () => {
    for (const v of vectors.serial) {
      const serial = generateSerial(() => Buffer.from(v.randomHex, 'hex'));
      expect(serial).toBe(v.serial);
      expect(isValidSerial(serial)).toBe(true);
    }
  });

  it('produces canonical 20-char serials from the CSPRNG default', () => {
    const serial = generateSerial();
    expect(serial).toHaveLength(SERIAL_LENGTH);
    expect(isCanonicalCrockford(serial)).toBe(true);
    expect(isValidSerial(serial)).toBe(true);
  });

  it('encodes 96 bits into 20 characters', () => {
    expect(SERIAL_RANDOM_BYTES * 8).toBe(96);
    expect(SERIAL_LENGTH).toBe(Math.ceil((SERIAL_RANDOM_BYTES * 8) / 5));
  });

  it('does not collide over a small sample', () => {
    const sample = new Set(Array.from({ length: 1000 }, () => generateSerial()));
    expect(sample.size).toBe(1000);
  });

  it('rejects a random source returning the wrong byte count', () => {
    expect(() => generateSerial(() => Buffer.alloc(11))).toThrow(/expected 12/);
  });
});

describe('isValidSerial', () => {
  it('rejects wrong length, lowercase, forbidden chars and bad padding', () => {
    const valid = generateSerial();
    expect(isValidSerial(valid)).toBe(true);
    expect(isValidSerial(valid.slice(0, 19))).toBe(false);
    expect(isValidSerial(valid.toLowerCase())).toBe(false);
    expect(isValidSerial(`U${valid.slice(1)}`)).toBe(false);
    // the 20th char carries a single data bit; anything but 0 or G has
    // non-zero padding bits and cannot come from encoding 12 bytes
    expect(isValidSerial(`${valid.slice(0, 19)}Z`)).toBe(false);
  });
});
