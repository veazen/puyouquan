/**
 * Seed: demo tenant + owner user (PROJECT_PLAN §8 Phase 1).
 * Run with the OWNER database url:
 *   DATABASE_URL=postgres://veazen:veazen@localhost:5432/veazen \
 *   MASTER_KEY=<64 hex> npx ts-node prisma/seed.ts
 */
import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

import { generateKeyPair } from '@veazen/crypto';

import { AppConfigService } from '../src/config/app-config.service';
import { EnvelopeService } from '../src/crypto/envelope.service';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const envelope = new EnvelopeService(new AppConfigService());

  const existing = await prisma.tenant.findUnique({ where: { slug: 'demo' } });
  if (existing) {
    console.log('demo tenant already present, skipping');
    return;
  }
  const keys = generateKeyPair();
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Demo Brand Co.',
      slug: 'demo',
      plan: 'starter',
      publicKey: new Uint8Array(keys.publicKey),
      encryptedPrivateKey: new Uint8Array(
        Buffer.from(envelope.encrypt(keys.privateKey), 'utf8'),
      ),
      settings: { mode: 'standard', brandColor: '#3fa37c' },
    },
  });
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'demo@veazen.app',
      passwordHash: await argon2.hash('demo-password-change-me', { type: argon2.argon2id }),
      role: 'owner',
    },
  });
  await prisma.product.create({
    data: {
      tenantId: tenant.id,
      name: 'Demo Product',
      sku: 'DEMO-001',
      description: 'Seeded demo product',
    },
  });
  console.log(`seeded demo tenant ${tenant.id}`);
  await prisma.$disconnect();
}

void main();
