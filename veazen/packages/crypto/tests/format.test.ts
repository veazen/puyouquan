import { describe, expect, it } from 'vitest';

import { formatForDisplay, isCanonicalCrockford, normalizeInput } from '../src/format';
import vectors from '../test-vectors/vectors.json';

describe('normalizeInput', () => {
  it('matches the committed test vectors (separators, case, confusables)', () => {
    for (const v of vectors.normalizeInput) {
      expect(normalizeInput(v.input)).toBe(v.normalized);
    }
  });

  it('strips hyphens, colons, whitespace and other separators', () => {
    expect(normalizeInput('A1B2C-D3E4F')).toBe('A1B2CD3E4F');
    expect(normalizeInput('A1B2C:D3E4F 6H7J8.K9M0N')).toBe('A1B2CD3E4F6H7J8K9M0N');
  });

  it('uppercases and maps confusables per Crockford decode rules', () => {
    expect(normalizeInput('oO0')).toBe('000');
    expect(normalizeInput('iIlL1')).toBe('11111');
    expect(normalizeInput('abcdef')).toBe('ABCDEF');
  });

  it('does not validate: U survives normalization but is not canonical', () => {
    expect(normalizeInput('u')).toBe('U');
    expect(isCanonicalCrockford('U')).toBe(false);
  });
});

describe('formatForDisplay', () => {
  it('matches the committed test vectors', () => {
    for (const v of vectors.formatForDisplay) {
      expect(formatForDisplay(v.input, v.groupSize)).toBe(v.output);
    }
  });

  it('groups by 5 by default and round-trips through normalizeInput', () => {
    const serial = 'A1B2CD3E4F6H7J8K9M0N';
    const display = formatForDisplay(serial);
    expect(display).toBe('A1B2C-D3E4F-6H7J8-K9M0N');
    expect(normalizeInput(display)).toBe(serial);
  });

  it('supports other group sizes (scratch codes use 4)', () => {
    expect(formatForDisplay('A1B2CD3E4F6H', 4)).toBe('A1B2-CD3E-4F6H');
  });

  it('rejects non-canonical input and invalid group sizes', () => {
    expect(() => formatForDisplay('a1b2c')).toThrow(/canonical/);
    expect(() => formatForDisplay('A1B2C-D3E4F')).toThrow(/canonical/);
    expect(() => formatForDisplay('A1B2C', 0)).toThrow(/group size/);
    expect(() => formatForDisplay('A1B2C', 2.5)).toThrow(/group size/);
  });
});
