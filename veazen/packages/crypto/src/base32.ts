/**
 * Crockford base32 (https://www.crockford.com/base32.html), bit-stream variant:
 * bytes are consumed MSB-first in 5-bit groups; the final group is zero-padded.
 * The alphabet excludes I, L, O, U to avoid confusable characters.
 */

export const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const CHAR_TO_VALUE: ReadonlyMap<string, number> = new Map(
  [...CROCKFORD_ALPHABET].map((ch, i) => [ch, i]),
);

/** Encode bytes to Crockford base32. Output length is ceil(bits / 5). */
export function encodeCrockford(bytes: Uint8Array): string {
  let bits = 0;
  let acc = 0;
  let out = '';
  for (const byte of bytes) {
    acc = (acc << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += CROCKFORD_ALPHABET[(acc >>> (bits - 5)) & 31];
      bits -= 5;
    }
    // keep the accumulator small so it never approaches 32-bit overflow
    acc &= (1 << bits) - 1;
  }
  if (bits > 0) {
    out += CROCKFORD_ALPHABET[(acc << (5 - bits)) & 31];
  }
  return out;
}

/**
 * Decode canonical Crockford base32 (uppercase, confusables already mapped —
 * see normalizeInput). Throws on invalid characters or non-zero padding bits.
 */
export function decodeCrockford(encoded: string): Uint8Array {
  let bits = 0;
  let acc = 0;
  const out: number[] = [];
  for (const ch of encoded) {
    const value = CHAR_TO_VALUE.get(ch);
    if (value === undefined) {
      throw new Error(`Invalid Crockford base32 character: ${JSON.stringify(ch)}`);
    }
    acc = (acc << 5) | value;
    bits += 5;
    if (bits >= 8) {
      out.push((acc >>> (bits - 8)) & 0xff);
      bits -= 8;
      acc &= (1 << bits) - 1;
    }
  }
  // A valid encoding leaves at most 4 padding bits; 5+ leftover bits mean the
  // string is one character longer than any encoding this module produces.
  // Without this check the mapping is not injective ('00' and '000' would
  // both decode to 0x00).
  if (bits >= 5) {
    throw new Error('Invalid Crockford base32 string: impossible encoding length');
  }
  if (acc !== 0) {
    throw new Error('Invalid Crockford base32 string: non-zero padding bits');
  }
  return Uint8Array.from(out);
}
