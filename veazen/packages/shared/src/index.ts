/**
 * Shared domain constants and types (PROJECT_PLAN §4–§5). Field and value
 * names here are the canonical spelling used across API, web and plugin.
 */

export const CODE_STATUSES = [
  'inactive',
  'active',
  'verified',
  'flagged',
  'voided',
  // SME suite M2 (RMA): relabelled-away old code / brand-QC resale
  'retired',
  'refurbished',
] as const;
export type CodeStatus = (typeof CODE_STATUSES)[number];

export const FLAG_REASONS = ['risk_rule', 'stolen', 'recalled', 'manual'] as const;
export type FlagReason = (typeof FLAG_REASONS)[number];

export const VERIFY_RESULTS = [
  'authentic',
  'already_verified',
  'invalid',
  'inactive',
  'flagged',
  // SME suite M2: neutral "recalled by the brand" / green endorsed resale
  'retired',
  'refurbished',
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
  // SME suite M2/M3: locked Lite code rescanned from a different device
  // fingerprint / same code released for resale ≥ 3 times
  'lite_duplicate_scan',
  'release_abuse',
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

/**
 * Code state machine (PROJECT_PLAN §5.3 + SME suite M2/M3) — the single
 * source of truth. M2/M3 arrows, merchant-credential only (security redline:
 * never "reset to never-verified" — release returns to active *with* an
 * audit trail and a release counter):
 *  - verified → active: release-for-resale, scratch-less codes only (the
 *    Lite first-scan lock is digital; a redeemed scratch layer is physical
 *    and irreversible, so scratch codes must go rma → refurbished or relabel)
 *  - active/verified/refurbished → retired: relabel binds a fresh code and
 *    retires this one (replaced_by keeps the trace chain)
 *  - verified/active → refurbished: RMA of a redeemed scratch code, or a
 *    release under the tenant's rma_display_policy = "refurbished"
 */
export const CODE_STATUS_TRANSITIONS: Readonly<Record<CodeStatus, readonly CodeStatus[]>> = {
  inactive: ['active', 'voided'],
  active: ['verified', 'flagged', 'voided', 'retired', 'refurbished'],
  verified: ['flagged', 'voided', 'active', 'retired', 'refurbished'],
  // flagged can only be lifted (unflag) back to the recorded prev_status
  // (active/verified); §5.3 defines no direct flagged → voided arrow
  flagged: ['active', 'verified'],
  voided: [],
  retired: [],
  refurbished: ['retired', 'voided'],
};

export function isValidCodeTransition(from: CodeStatus, to: CodeStatus): boolean {
  return CODE_STATUS_TRANSITIONS[from].includes(to);
}

/** Public verify endpoint response shape (PROJECT_PLAN §5.1). */
export interface VerifyResponse {
  result: VerifyResult;
  /** present when result=flagged so the page can vary copy (§5.3: stolen…) */
  flag_reason?: FlagReason;
  /**
   * present when result=refurbished (SME suite M2): how many times this code
   * was verified before the brand's QC resale — the endorsement copy shows
   * the history instead of hiding it
   */
  verified_history_count?: number;
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
