import { describe, expect, it } from 'vitest';

import { extractSerialFromScan } from './parse-serial';

describe('extractSerialFromScan (E1 returns-desk scanner)', () => {
  it('extracts the serial from a /v/ verify link, dropping the signature', () => {
    expect(
      extractSerialFromScan('https://verify.veazen.app/v/A1B2CD3E4F6H7J8K9M0N?sig=abc123'),
    ).toBe('A1B2CD3E4F6H7J8K9M0N');
  });

  it('extracts the serial from a GS1 Digital Link (/01/{gtin}/21/{serial})', () => {
    expect(
      extractSerialFromScan('https://verify.veazen.app/01/09506000134352/21/A1B2CD3E4F6H7J8K9M0N?sig=x'),
    ).toBe('A1B2CD3E4F6H7J8K9M0N');
  });

  it('handles custom hostnames, ports and URL-encoded segments', () => {
    expect(extractSerialFromScan('http://localhost:3000/v/A1B2C-D3E4F?sig=s')).toBe('A1B2C-D3E4F');
    expect(extractSerialFromScan('https://check.brand.example/v/A1B2%2DCD?x=1')).toBe('A1B2-CD');
  });

  it('passes through non-URL scans as the serial itself (trimmed)', () => {
    expect(extractSerialFromScan('  A1B2CD3E4F6H7J8K9M0N  ')).toBe('A1B2CD3E4F6H7J8K9M0N');
    expect(extractSerialFromScan('a1b2c-d3e4f-6h7j8-k9m0n')).toBe('a1b2c-d3e4f-6h7j8-k9m0n');
  });

  it('falls back to the last path segment for unknown URL shapes', () => {
    expect(extractSerialFromScan('https://example.com/codes/A1B2CD3E4F?utm=x')).toBe('A1B2CD3E4F');
    expect(extractSerialFromScan('https://example.com/')).toBe('https://example.com/');
  });
});
