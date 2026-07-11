/**
 * Shared domain constants and types (PROJECT_PLAN §4–§5). Field and value
 * names here are the canonical spelling used across API, web and plugin.
 */

export const CODE_STATUSES = ['inactive', 'active', 'verified', 'flagged', 'voided'] as const;
export type CodeStatus = (typeof CODE_STATUSES)[number];

export const FLAG_REASONS = ['risk_rule', 'stolen', 'recalled', 'manual'] as const;
export type FlagReason = (typeof FLAG_REASONS)[number];

export const VERIFY_RESULTS = [
  'authentic',
  'already_verified',
  'invalid',
  'inactive',
  'flagged',
] as const;
export type VerifyResult = (typeof VERIFY_RESULTS)[number];

export const SCAN_EVENT_KINDS = [
  'public_scan',
  'scratch_verify',
  'activation',
  'inspector_scan',
] as const;
export type ScanEventKind = (typeof SCAN_EVENT_KINDS)[number];

export const TENANT_PLANS = ['free', 'starter', 'growth', 'enterprise'] as const;
export type TenantPlan = (typeof TENANT_PLANS)[number];

export const TENANT_MODES = ['standard', 'lite'] as const;
export type TenantMode = (typeof TENANT_MODES)[number];

export const ALERT_RULES = [
  'duplicate_scratch',
  'geo_velocity',
  'out_of_market',
  'scan_burst',
  // additive: raised when consecutive failures auto-disable a webhook endpoint
  'webhook_failure',
] as const;
export type AlertRule = (typeof ALERT_RULES)[number];

export const WEBHOOK_EVENT_TYPES = [
  'code.verified',
  'code.duplicate_attempt',
  'code.flagged',
  'batch.ready',
  'alert.created',
] as const;
export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

/** Code state machine (PROJECT_PLAN §5.3) — the single source of truth. */
export const CODE_STATUS_TRANSITIONS: Readonly<Record<CodeStatus, readonly CodeStatus[]>> = {
  inactive: ['active', 'voided'],
  active: ['verified', 'flagged', 'voided'],
  verified: ['flagged', 'voided'],
  // flagged can only be lifted (unflag) back to the recorded prev_status
  // (active/verified); §5.3 defines no direct flagged → voided arrow
  flagged: ['active', 'verified'],
  voided: [],
};

export function isValidCodeTransition(from: CodeStatus, to: CodeStatus): boolean {
  return CODE_STATUS_TRANSITIONS[from].includes(to);
}

/** Public verify endpoint response shape (PROJECT_PLAN §5.1). */
export interface VerifyResponse {
  result: VerifyResult;
  /** present when result=flagged so the page can vary copy (§5.3: stolen…) */
  flag_reason?: FlagReason;
  product: {
    name: string;
    images: string[];
    brand: Record<string, unknown>;
  } | null;
  trace: Array<{ step: string; location: string | null; date: string }>;
  first_verified_at: string | null;
  scan_count_hint: 'first_scan' | 'scanned_before';
  verify_page_config: Record<string, unknown>;
}

/** GS1 Digital Link compatible path, or the internal fallback (§1.5). */
export function buildVerifyPath(serial: string, gtin?: string): string {
  return gtin ? `/01/${gtin}/21/${serial}` : `/v/${serial}`;
}
