import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { merkleLeafHash, merkleRootHex } from '../src/merkle';

const sha256 = (...parts: Buffer[]): Buffer => {
  const h = createHash('sha256');
  for (const p of parts) h.update(p);
  return h.digest();
};

describe('merkleLeafHash', () => {
  it('domain-separates leaves with the 0x00 prefix', () => {
    expect(merkleLeafHash('abc').toString('hex')).toBe(
      sha256(Buffer.from([0x00]), Buffer.from('abc')).toString('hex'),
    );
    expect(merkleLeafHash(Buffer.from('abc'))).toEqual(merkleLeafHash('abc'));
  });
});

describe('merkleRootHex', () => {
  it('root of a single leaf is the leaf itself', () => {
    const leaf = merkleLeafHash('only');
    expect(merkleRootHex([leaf])).toBe(leaf.toString('hex'));
  });

  it('root of two leaves is the 0x01-prefixed pair hash', () => {
    const a = merkleLeafHash('a');
    const b = merkleLeafHash('b');
    expect(merkleRootHex([a, b])).toBe(sha256(Buffer.from([0x01]), a, b).toString('hex'));
  });

  it('promotes the odd node unchanged (3 leaves)', () => {
    const [a, b, c] = [merkleLeafHash('a'), merkleLeafHash('b'), merkleLeafHash('c')];
    const ab = sha256(Buffer.from([0x01]), a, b);
    expect(merkleRootHex([a, b, c])).toBe(sha256(Buffer.from([0x01]), ab, c).toString('hex'));
  });

  it('defines a stable root for an empty day', () => {
    expect(merkleRootHex([])).toBe(merkleLeafHash(Buffer.alloc(0)).toString('hex'));
    expect(merkleRootHex([])).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is order-sensitive and tamper-evident', () => {
    const leaves = ['e1', 'e2', 'e3', 'e4'].map((s) => merkleLeafHash(s));
    const root = merkleRootHex(leaves);
    expect(merkleRootHex([...leaves].reverse())).not.toBe(root);
    const tampered = [...leaves];
    tampered[2] = merkleLeafHash('e3-tampered');
    expect(merkleRootHex(tampered)).not.toBe(root);
  });

  it('leaf/node domain separation prevents level-collapse collisions', () => {
    const a = merkleLeafHash('a');
    const b = merkleLeafHash('b');
    // a leaf whose payload equals the concatenated children must not equal the parent
    const fakeLeaf = merkleLeafHash(Buffer.concat([a, b]));
    expect(merkleRootHex([fakeLeaf])).not.toBe(merkleRootHex([a, b]));
  });
});
