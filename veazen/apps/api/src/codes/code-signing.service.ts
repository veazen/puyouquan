import { Injectable, NotFoundException } from '@nestjs/common';

import { signCode, truncatedSig, verifyTruncatedSig } from '@veazen/crypto';

import { EnvelopeService } from '../crypto/envelope.service';
import { PrismaService } from '../prisma/prisma.service';

interface TenantKeyEntry {
  seed: Buffer;
  cachedAt: number;
}

const KEY_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Per-tenant Ed25519 signing (§2.4). Private seeds are envelope-encrypted at
 * rest (§9.1) and cached decrypted in memory briefly — verify is the hottest
 * path in the system (§1.8).
 */
@Injectable()
export class CodeSigningService {
  private readonly cache = new Map<string, TenantKeyEntry>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly envelope: EnvelopeService,
  ) {}

  private async tenantSeed(tenantId: string): Promise<Buffer> {
    const cached = this.cache.get(tenantId);
    if (cached && Date.now() - cached.cachedAt < KEY_CACHE_TTL_MS) {
      return cached.seed;
    }
    const tenant = await this.prisma.asSystem((tx) =>
      tx.tenant.findUnique({
        where: { id: tenantId },
        select: { encryptedPrivateKey: true },
      }),
    );
    if (!tenant) {
      throw new NotFoundException('tenant not found');
    }
    const seed = this.envelope.decrypt(Buffer.from(tenant.encryptedPrivateKey).toString('utf8'));
    this.cache.set(tenantId, { seed, cachedAt: Date.now() });
    return seed;
  }

  /** Truncated signature for the QR URL `sig` param. */
  async signSerial(tenantId: string, batchId: string, serial: string): Promise<string> {
    const seed = await this.tenantSeed(tenantId);
    return truncatedSig(signCode({ serial, tenantId, batchId }, seed));
  }

  /** Full server-side check of a presented truncated sig (§2.4). */
  async verifySerialSig(
    tenantId: string,
    batchId: string,
    serial: string,
    candidate: string,
  ): Promise<boolean> {
    const seed = await this.tenantSeed(tenantId);
    return verifyTruncatedSig({ serial, tenantId, batchId }, candidate, seed);
  }
}
