/**
 * Display formatting & input normalization (PROJECT_PLAN §2.4).
 *
 * Storage/verification always uses the canonical form (uppercase, no
 * separators). Display surfaces (verify page, exports, PDF labels, plugin UI)
 * insert hyphens in groups. Every verification entry point must run raw user
 * input through normalizeInput() before lookup.
 */

import { CROCKFORD_ALPHABET } from './base32';

export const DEFAULT_DISPLAY_GROUP_SIZE = 5;

const CANONICAL_RE = new RegExp(`^[${CROCKFORD_ALPHABET}]+$`);

/**
 * Normalize raw user input to canonical form:
 * - strip separators (hyphen, colon, whitespace, dots and any other
 *   non-alphanumeric characters)
 * - uppercase
 * - map confusables: I/L → 1, O → 0 (Crockford decode rules)
 *
 * Purely syntactic — it does not validate length or charset (U, for example,
 * survives normalization and is rejected by isCanonicalSerial / decode).
 */
export function normalizeInput(raw: string): string {
  return raw
    .replace(/[^0-9a-zA-Z]/g, '')
    .toUpperCase()
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0');
}

/** True when the string is entirely canonical Crockford base32 characters. */
export function isCanonicalCrockford(value: string): boolean {
  return CANONICAL_RE.test(value);
}

/**
 * Format a canonical serial / scratch code for display by inserting hyphens
 * every `groupSize` characters, e.g. A1B2C-D3E4F-…
 * Throws if the input is not already canonical (never format raw input).
 */
export function formatForDisplay(
  value: string,
  groupSize: number = DEFAULT_DISPLAY_GROUP_SIZE,
): string {
  if (!Number.isInteger(groupSize) || groupSize < 1) {
    throw new Error(`Invalid display group size: ${groupSize}`);
  }
  if (!isCanonicalCrockford(value)) {
    throw new Error('formatForDisplay expects a canonical (normalized) value');
  }
  const groups: string[] = [];
  for (let i = 0; i < value.length; i += groupSize) {
    groups.push(value.slice(i, i + groupSize));
  }
  return groups.join('-');
}
