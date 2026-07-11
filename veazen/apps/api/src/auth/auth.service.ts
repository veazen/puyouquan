import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';

import { CROCKFORD_ALPHABET, generateKeyPair } from '@veazen/crypto';

import { EnvelopeService } from '../crypto/envelope.service';
import { PrismaService } from '../prisma/prisma.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  ten: string;
  role: string;
  typ: 'access' | 'refresh';
}

export const API_KEY_PREFIX = 'vz_';
const API_KEY_PREFIX_CHARS = 8;
const API_KEY_SECRET_CHARS = 32;

function randomCrockford(length: number): string {
  const bytes = randomBytes(length);
  let out = '';
  for (const byte of bytes) {
    out += CROCKFORD_ALPHABET[byte & 31];
  }
  return out;
}

export function hashApiKey(fullKey: string): string {
  return createHash('sha256').update(fullKey, 'utf8').digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly envelope: EnvelopeService,
  ) {}

  /** Create tenant (with Ed25519 keypair) + owner user; returns tokens. */
  async register(input: {
    tenantName: string;
    slug: string;
    email: string;
    password: string;
    mode?: 'standard' | 'lite';
  }): Promise<{ tenantId: string; userId: string } & AuthTokens> {
    const keys = generateKeyPair();
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });

    const created = await this.prisma.asSystem(async (tx) => {
      const existingSlug = await tx.tenant.findUnique({ where: { slug: input.slug } });
      if (existingSlug) {
        throw new ConflictException('slug already taken');
      }
      const existingEmail = await tx.user.findUnique({ where: { email: input.email } });
      if (existingEmail) {
        throw new ConflictException('email already registered');
      }
      const tenant = await tx.tenant.create({
        data: {
          name: input.tenantName,
          slug: input.slug,
          publicKey: new Uint8Array(keys.publicKey),
          encryptedPrivateKey: new Uint8Array(Buffer.from(this.envelope.encrypt(keys.privateKey), 'utf8')),
          settings: { mode: input.mode ?? 'standard' },
        },
      });
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: input.email,
          passwordHash,
          role: 'owner',
        },
      });
      return { tenantId: tenant.id, userId: user.id };
    });

    return { ...created, ...this.issueTokens(created.userId, created.tenantId, 'owner') };
  }

  async login(email: string, password: string): Promise<AuthTokens & { tenantId: string }> {
    const user = await this.prisma.asSystem((tx) => tx.user.findUnique({ where: { email } }));
    if (!user || !(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException('invalid credentials');
    }
    return { tenantId: user.tenantId, ...this.issueTokens(user.id, user.tenantId, user.role) };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('invalid refresh token');
    }
    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('not a refresh token');
    }
    return this.issueTokens(payload.sub, payload.ten, payload.role);
  }

  private issueTokens(userId: string, tenantId: string, role: string): AuthTokens {
    const base = { sub: userId, ten: tenantId, role };
    return {
      // §2.1: access 15min / refresh 7d
      accessToken: this.jwt.sign({ ...base, typ: 'access' }, { expiresIn: '15m' }),
      refreshToken: this.jwt.sign({ ...base, typ: 'refresh' }, { expiresIn: '7d' }),
    };
  }

  /** Issue a tenant API key; the full key is returned exactly once. */
  async createApiKey(tenantId: string, label: string): Promise<{ id: string; apiKey: string }> {
    const prefix = randomCrockford(API_KEY_PREFIX_CHARS);
    const fullKey = `${API_KEY_PREFIX}${prefix}${randomCrockford(API_KEY_SECRET_CHARS)}`;
    const record = await this.prisma.withTenant(tenantId, (tx) =>
      tx.apiKey.create({
        data: { tenantId, keyPrefix: prefix, keyHash: hashApiKey(fullKey), label },
      }),
    );
    return { id: record.id, apiKey: fullKey };
  }

  /** Resolve a presented API key to its tenant; null if invalid/revoked. */
  async resolveApiKey(presented: string): Promise<{ tenantId: string; apiKeyId: string } | null> {
    if (!presented.startsWith(API_KEY_PREFIX)) {
      return null;
    }
    const body = presented.slice(API_KEY_PREFIX.length);
    if (body.length !== API_KEY_PREFIX_CHARS + API_KEY_SECRET_CHARS) {
      return null;
    }
    const prefix = body.slice(0, API_KEY_PREFIX_CHARS);
    const candidates = await this.prisma.asSystem((tx) =>
      tx.apiKey.findMany({ where: { keyPrefix: prefix, revokedAt: null } }),
    );
    const presentedHash = Buffer.from(hashApiKey(presented), 'utf8');
    for (const candidate of candidates) {
      const stored = Buffer.from(candidate.keyHash, 'utf8');
      if (stored.length === presentedHash.length && timingSafeEqual(stored, presentedHash)) {
        // best-effort usage stamp; never blocks the request path
        void this.prisma
          .withTenant(candidate.tenantId, (tx) =>
            tx.apiKey.update({ where: { id: candidate.id }, data: { lastUsedAt: new Date() } }),
          )
          .catch(() => undefined);
        return { tenantId: candidate.tenantId, apiKeyId: candidate.id };
      }
    }
    return null;
  }
}
