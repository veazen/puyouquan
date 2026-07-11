/**
 * Regenerates test-vectors/vectors.json from the built library (run
 * `npm run build` first). The Ed25519 plumbing is independently validated
 * against RFC 8032 vectors in tests/signing.test.ts, and the Crockford
 * encoding against Python's base64.b32encode (alphabet-translated) — see
 * the vector file's `oracle` notes.
 *
 * Usage: node scripts/generate-vectors.mjs > test-vectors/vectors.json
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  encodeCrockford,
  generateSerial,
  generateScratchCode,
  hashScratchCode,
  normalizeInput,
  formatForDisplay,
  publicKeyFromSeed,
  signCode,
  truncatedSig,
} = require('../dist/index.js');

const crockfordHex = ['00', 'ff', '48656c6c6f', 'deadbeef', '0102030405060708090a0b0c'];

const serialRandoms = [
  '000000000000000000000000',
  'ffffffffffffffffffffffff',
  '0102030405060708090a0b0c',
  '5f8a3bc4d21e09f7a6b58c3d',
];

const normalizeCases = [
  'A1B2C-D3E4F-6H7J8-K9M0N',
  'a1b2c-d3e4f-6h7j8-k9m0n',
  'A1B2C:D3E4F 6H7J8.K9M0N',
  'oO0-iIl-L1',
  '  z z z  ',
  'Ab-Cd_Ef',
];

const displayCases = [
  { input: 'A1B2CD3E4F6H7J8K9M0N', groupSize: 5 },
  { input: 'A1B2CD3E4F6H', groupSize: 4 },
  { input: 'ABC', groupSize: 5 },
];

const ed25519Cases = [
  {
    privateKeySeedHex: '0000000000000000000000000000000000000000000000000000000000000001',
    serial: 'A1B2CD3E4F6H7J8K9M0N',
    tenantId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    batchId: '11111111-2222-3333-4444-555555555555',
  },
  {
    privateKeySeedHex: '9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60',
    serial: generateSerial(() => Buffer.from('0102030405060708090a0b0c', 'hex')),
    tenantId: '00000000-0000-4000-8000-000000000000',
    batchId: 'ffffffff-ffff-4fff-bfff-ffffffffffff',
  },
];

const scratchRandoms = ['000000000000000000000000'.slice(0, 24), 'ffeeddccbbaa998877665544'];

// must stay within the de-confused Crockford alphabet (no I/L/O/U)
const scratchVectorCode = 'V3AZ3N0TRACE';

const vectors = {
  _meta: {
    description:
      'Test vectors for @veazen/crypto (PROJECT_PLAN §2.4). Regenerate with scripts/generate-vectors.mjs.',
    oracle:
      'Crockford encoding cross-checked against Python base64.b32encode with RFC4648→Crockford alphabet translation; Ed25519 plumbing validated against RFC 8032 §7.1 TEST 1 in tests/signing.test.ts.',
  },
  crockford: crockfordHex.map((hex) => ({
    hex,
    encoded: encodeCrockford(Buffer.from(hex, 'hex')),
  })),
  serial: serialRandoms.map((randomHex) => ({
    randomHex,
    serial: generateSerial(() => Buffer.from(randomHex, 'hex')),
  })),
  normalizeInput: normalizeCases.map((input) => ({ input, normalized: normalizeInput(input) })),
  formatForDisplay: displayCases.map(({ input, groupSize }) => ({
    input,
    groupSize,
    output: formatForDisplay(input, groupSize),
  })),
  ed25519: ed25519Cases.map((c) => {
    const seed = Buffer.from(c.privateKeySeedHex, 'hex');
    const input = { serial: c.serial, tenantId: c.tenantId, batchId: c.batchId };
    const sig = signCode(input, seed);
    return {
      ...c,
      publicKeyHex: publicKeyFromSeed(seed).toString('hex'),
      sig,
      sigTruncated: truncatedSig(sig),
    };
  }),
  scratch: {
    generation: scratchRandoms.map((randomHex) => ({
      randomHex,
      code: generateScratchCode(() => Buffer.from(randomHex, 'hex')),
    })),
    argon2id: {
      code: scratchVectorCode,
      hash: await hashScratchCode(scratchVectorCode),
    },
  },
};

process.stdout.write(`${JSON.stringify(vectors, null, 2)}\n`);
