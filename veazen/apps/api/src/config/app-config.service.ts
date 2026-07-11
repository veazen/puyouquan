import { Injectable } from '@nestjs/common';

/**
 * Environment configuration (PROJECT_PLAN §11), validated at boot.
 * §9.1: the API refuses to start without a well-formed MASTER_KEY.
 */
@Injectable()
export class AppConfigService {
  readonly databaseUrl: string;
  readonly redisUrl: string;
  readonly masterKey: Buffer;
  readonly jwtSecret: string;
  readonly publicVerifyBaseUrl: string;
  readonly smtpHost: string | null;
  readonly smtpPort: number;
  readonly smtpUser: string | null;
  readonly smtpPass: string | null;
  readonly geoipDbPath: string | null;
  readonly anonymizeIp: boolean;
  readonly storageDir: string;
  readonly port: number;
  /** benchmark escape hatch only — never set in production */
  readonly rateLimitDisabled: boolean;

  constructor() {
    const env = process.env;
    this.databaseUrl = requireEnv(env, 'DATABASE_URL');
    this.redisUrl = requireEnv(env, 'REDIS_URL');

    const masterKeyHex = requireEnv(env, 'MASTER_KEY');
    if (!/^[0-9a-fA-F]{64}$/.test(masterKeyHex)) {
      throw new Error('MASTER_KEY must be 32 bytes of hex (64 hex chars) — refusing to start (§9.1)');
    }
    this.masterKey = Buffer.from(masterKeyHex, 'hex');

    this.jwtSecret = requireEnv(env, 'JWT_SECRET');
    this.publicVerifyBaseUrl = env.PUBLIC_VERIFY_BASE_URL ?? 'https://verify.veazen.app';
    this.smtpHost = env.SMTP_HOST ?? null;
    this.smtpPort = env.SMTP_PORT ? Number(env.SMTP_PORT) : 1025;
    this.smtpUser = env.SMTP_USER ?? null;
    this.smtpPass = env.SMTP_PASS ?? null;
    this.geoipDbPath = env.GEOIP_DB_PATH ?? null;
    this.anonymizeIp = env.ANONYMIZE_IP === 'true';
    // S3-compatible storage lands with deploy (Phase 4); dev/test use a local
    // directory behind the same StorageService interface (ADR-008).
    this.storageDir = env.STORAGE_DIR ?? '.storage';
    this.port = env.PORT ? Number(env.PORT) : 4000;
    this.rateLimitDisabled = env.RATE_LIMIT_DISABLED === 'true';
  }
}

function requireEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name} — refusing to start`);
  }
  return value;
}
