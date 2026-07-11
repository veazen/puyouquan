/**
 * Merkle root over scan-event hashes (PROJECT_PLAN §1.10 / scan_digests).
 *
 * Leaves are SHA-256 hashes of each event's canonical JSON. Levels are built
 * by hashing the concatenation of each adjacent pair; an odd node is promoted
 * unchanged (Bitcoin-style duplication is deliberately avoided — promotion
 * cannot be exploited here because event_count is stored alongside the root).
 * Interior nodes are domain-separated from leaves to rule out second-preimage
 * tricks (CVE-2012-2459 class).
 */

import { createHash } from 'node:crypto';

const LEAF_PREFIX = Buffer.from([0x00]);
const NODE_PREFIX = Buffer.from([0x01]);

function sha256(...parts: Buffer[]): Buffer {
  const hash = createHash('sha256');
  for (const part of parts) {
    hash.update(part);
  }
  return hash.digest();
}

/** Hash one canonical leaf payload (e.g. a scan event's canonical JSON). */
export function merkleLeafHash(payload: Buffer | string): Buffer {
  const data = typeof payload === 'string' ? Buffer.from(payload, 'utf8') : payload;
  return sha256(LEAF_PREFIX, data);
}

/**
 * Compute the Merkle root (hex) of pre-hashed leaves, in order.
 * The root of an empty day is defined as sha256 of the empty string with the
 * leaf prefix, so empty days still chain verifiably.
 */
export function merkleRootHex(leaves: Buffer[]): string {
  if (leaves.length === 0) {
    return merkleLeafHash(Buffer.alloc(0)).toString('hex');
  }
  let level = leaves;
  while (level.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i] as Buffer;
      const right = level[i + 1];
      next.push(right === undefined ? left : sha256(NODE_PREFIX, left, right));
    }
    level = next;
  }
  return (level[0] as Buffer).toString('hex');
}
