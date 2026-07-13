import { describe, expect, it } from 'vitest';

import {
  CODE_STATUSES,
  CODE_STATUS_TRANSITIONS,
  buildVerifyPath,
  isValidCodeTransition,
} from '../src/index';

describe('code state machine (§5.3)', () => {
  it('permits the documented transitions', () => {
    expect(isValidCodeTransition('inactive', 'active')).toBe(true);
    expect(isValidCodeTransition('active', 'verified')).toBe(true);
    expect(isValidCodeTransition('active', 'flagged')).toBe(true);
    expect(isValidCodeTransition('flagged', 'active')).toBe(true);
    expect(isValidCodeTransition('inactive', 'voided')).toBe(true);
    expect(isValidCodeTransition('verified', 'voided')).toBe(true);
  });

  it('permits the SME suite M2/M3 transitions (RMA / release / relabel)', () => {
    // release-for-resale: digital first-scan lock is merchant-reversible
    expect(isValidCodeTransition('verified', 'active')).toBe(true);
    // relabel retires the old code from any sellable state
    expect(isValidCodeTransition('active', 'retired')).toBe(true);
    expect(isValidCodeTransition('verified', 'retired')).toBe(true);
    expect(isValidCodeTransition('refurbished', 'retired')).toBe(true);
    // RMA of a redeemed scratch code / release under the refurbished policy
    expect(isValidCodeTransition('verified', 'refurbished')).toBe(true);
    expect(isValidCodeTransition('active', 'refurbished')).toBe(true);
  });

  it('rejects illegal transitions (API returns 409 for these)', () => {
    expect(isValidCodeTransition('inactive', 'verified')).toBe(false);
    expect(isValidCodeTransition('voided', 'active')).toBe(false);
    expect(isValidCodeTransition('inactive', 'flagged')).toBe(false);
    // §5.3 draws no flagged → voided arrow: a flagged code must be unflagged first
    expect(isValidCodeTransition('flagged', 'voided')).toBe(false);
    // retired is terminal — a replaced label never comes back
    expect(isValidCodeTransition('retired', 'active')).toBe(false);
    expect(isValidCodeTransition('retired', 'refurbished')).toBe(false);
    // refurbished never silently returns to a "fresh" look
    expect(isValidCodeTransition('refurbished', 'active')).toBe(false);
    expect(isValidCodeTransition('refurbished', 'verified')).toBe(false);
  });

  it('covers every status exactly once', () => {
    expect(Object.keys(CODE_STATUS_TRANSITIONS).sort()).toEqual([...CODE_STATUSES].sort());
  });
});

describe('buildVerifyPath (§1.5)', () => {
  it('uses GS1 Digital Link when a GTIN exists, internal path otherwise', () => {
    expect(buildVerifyPath('A1B2CD3E4F6H7J8K9M0N', '09506000134352')).toBe(
      '/01/09506000134352/21/A1B2CD3E4F6H7J8K9M0N',
    );
    expect(buildVerifyPath('A1B2CD3E4F6H7J8K9M0N')).toBe('/v/A1B2CD3E4F6H7J8K9M0N');
  });
});
