import { Injectable, Logger } from '@nestjs/common';

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
  /** Resend HTTP API key — hosts like Railway block outbound SMTP ports. */
  readonly resendApiKey: string | null;
  readonly geoipDbPath: string | null;
  readonly anonymizeIp: boolean;
  readonly storageDir: string;
  readonly s3Endpoint: string | null;
  readonly s3Bucket: string | null;
  readonly s3AccessKey: string | null;
  readonly s3SecretKey: string | null;
  readonly port: number;
  /** benchmark escape hatch only — never set in production */
  readonly rateLimitDisabled: boolean;
  // P1 billing (Lemon Squeezy) — every variable optional; missing config
  // degrades to "billing features off", never a boot failure.
  /** master switch for the plan gates; default off = zero production impact */
  readonly billingEnforcement: boolean;
  readonly lemonSqueezyApiKey: string | null;
  readonly lemonSqueezyStoreId: string | null;
  readonly lemonSqueezyWebhookSecret: string | null;
  /** plan → hosted checkout URL, e.g. {"starter":"https://…/buy/xxx"} */
  readonly lemonSqueezyCheckoutUrls: Record<string, string>;
  /** LS variant_id → plan, e.g. {"123456":"starter"} */
  readonly lemonSqueezyVariantPlanMap: Record<string, string>;

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
    // explicit RESEND_API_KEY wins; otherwise reuse the Resend SMTP secret,
    // which doubles as the HTTP API key (re_…)
    this.resendApiKey =
      env.RESEND_API_KEY ??
      (this.smtpHost === 'smtp.resend.com' && this.smtpPass?.startsWith('re_')
        ? this.smtpPass
        : null);
    this.geoipDbPath = env.GEOIP_DB_PATH ?? null;
    this.anonymizeIp = env.ANONYMIZE_IP === 'true';
    // Storage driver selection (ADR-008): S3-compatible (R2/MinIO) when the
    // §11 S3_* variables are present, local directory otherwise (dev/test).
    this.storageDir = env.STORAGE_DIR ?? '.storage';
    this.s3Endpoint = env.S3_ENDPOINT ?? null;
    this.s3Bucket = env.S3_BUCKET ?? null;
    this.s3AccessKey = env.S3_ACCESS_KEY ?? null;
    this.s3SecretKey = env.S3_SECRET_KEY ?? null;
    this.port = env.PORT ? Number(env.PORT) : 4000;
    this.rateLimitDisabled = env.RATE_LIMIT_DISABLED === 'true';
    this.billingEnforcement = env.BILLING_ENFORCEMENT === 'on';
    this.lemonSqueezyApiKey = env.LEMONSQUEEZY_API_KEY ?? null;
    this.lemonSqueezyStoreId = env.LEMONSQUEEZY_STORE_ID ?? null;
    this.lemonSqueezyWebhookSecret = env.LEMONSQUEEZY_WEBHOOK_SECRET ?? null;
    this.lemonSqueezyCheckoutUrls = parseJsonRecord(env.LEMONSQUEEZY_CHECKOUT_URLS, 'LEMONSQUEEZY_CHECKOUT_URLS');
    this.lemonSqueezyVariantPlanMap = parseJsonRecord(env.LEMONSQUEEZY_VARIANT_PLAN_MAP, 'LEMONSQUEEZY_VARIANT_PLAN_MAP');
  }
}

/** Optional JSON env of string→string; malformed input logs and degrades to {}. */
function parseJsonRecord(raw: string | undefined, name: string): Record<string, string> {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('not a JSON object');
    }
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
    );
  } catch (error) {
    Logger.warn(`ignoring malformed ${name}: ${(error as Error).message}`, 'AppConfigService');
    return {};
  }
}

function requireEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name} — refusing to start`);
  }
  return value;
}
