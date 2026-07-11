import { describe, expect, it } from 'vitest';

import { formatForDisplay, isCanonicalCrockford, normalizeInput } from '@veazen/crypto/format';

// The web app has no local display/normalization logic by design: §2.4
// mandates that formatForDisplay/normalizeInput from @veazen/crypto are the
// single implementation reused on every surface. This contract test pins the
// exact behavior the /v/[serial] route relies on.
describe('verify-route display contract (@veazen/crypto/format)', () => {
  it('round-trips a canonical serial through display formatting', () => {
    const serial = 'A1B2CD3E4F6H7J8K9M0N';
    expect(formatForDisplay(serial)).toBe('A1B2C-D3E4F-6H7J8-K9M0N');
    expect(normalizeInput(formatForDisplay(serial))).toBe(serial);
  });

  it('normalizes URL-style raw input: separators, case, confusables', () => {
    expect(normalizeInput('a1b2c-d3e4f-6h7j8-k9m0n')).toBe('A1B2CD3E4F6H7J8K9M0N');
    expect(normalizeInput('AoB1C:iLlo 0')).toBe('A0B1C11100');
  });

  it('flags non-canonical input so the page never formats garbage', () => {
    expect(isCanonicalCrockford(normalizeInput('serial-with-U'))).toBe(false);
    expect(isCanonicalCrockford(normalizeInput('A1B2C-D3E4F'))).toBe(true);
    expect(normalizeInput('!!!')).toBe('');
  });
});
