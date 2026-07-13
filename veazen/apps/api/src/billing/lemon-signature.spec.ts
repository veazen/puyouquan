import { createHmac } from 'node:crypto';

import { verifyLemonSignature } from './lemon-signature';

describe('verifyLemonSignature', () => {
  const secret = 'test-webhook-secret';
  const body = Buffer.from('{"meta":{"event_name":"subscription_created"}}', 'utf8');
  const goodSig = createHmac('sha256', secret).update(body).digest('hex');

  it('accepts the correct signature', () => {
    expect(verifyLemonSignature(body, goodSig, secret)).toBe(true);
  });

  it('accepts an upper-cased hex signature (case-insensitive hex)', () => {
    expect(verifyLemonSignature(body, goodSig.toUpperCase(), secret)).toBe(true);
  });

  it('rejects a wrong signature of the right length', () => {
    const wrong = goodSig.replace(/^./, goodSig.startsWith('a') ? 'b' : 'a');
    expect(verifyLemonSignature(body, wrong, secret)).toBe(false);
  });

  it('rejects a signature computed with another secret', () => {
    const otherSig = createHmac('sha256', 'other-secret').update(body).digest('hex');
    expect(verifyLemonSignature(body, otherSig, secret)).toBe(false);
  });

  it('rejects a signature over a different body', () => {
    expect(verifyLemonSignature(Buffer.from('{}', 'utf8'), goodSig, secret)).toBe(false);
  });

  it('rejects truncated / malformed headers without throwing', () => {
    expect(verifyLemonSignature(body, goodSig.slice(0, 10), secret)).toBe(false);
    expect(verifyLemonSignature(body, '', secret)).toBe(false);
    expect(verifyLemonSignature(body, undefined, secret)).toBe(false);
  });

  it('fails closed when the secret or raw body is missing', () => {
    expect(verifyLemonSignature(body, goodSig, null)).toBe(false);
    expect(verifyLemonSignature(body, goodSig, '')).toBe(false);
    expect(verifyLemonSignature(undefined, goodSig, secret)).toBe(false);
  });
});
