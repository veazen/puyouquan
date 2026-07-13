/**
 * P1 plan matrix — the single source of truth for what each tier may do
 * (docs/MONETIZATION_PLAN_zh.md §三; marketing pricing page mirrors this).
 * Pure constants: no Nest / Prisma imports so the matrix is trivially
 * unit-testable and shareable.
 *
 * | plan       | codes/mo | scratch | webhooks | serialProfiles | returnsSuite | teamInvites |
 * |------------|----------|---------|----------|----------------|--------------|-------------|
 * | free       |      500 |    ✗    |    ✗     |       ✗        |      ✗       |      ✗      |
 * | starter    |    5 000 |    ✓    |    ✗     |       ✗        |      ✓       |      ✗      |
 * | growth     |   50 000 |    ✓    |    ✓     |       ✓        |      ✓       |      ✓      |
 * | enterprise |        ∞ |    ✓    |    ✓     |       ✓        |      ✓       |      ✓      |
 */

/** Mirrors the Prisma `TenantPlan` enum — keep in sync with schema.prisma. */
export type PlanId = 'free' | 'starter' | 'growth' | 'enterprise';

export const PLAN_IDS = ['free', 'starter', 'growth', 'enterprise'] as const satisfies readonly PlanId[];

/** Boolean capability switches (the monthly code quota lives separately). */
export type PlanFeature =
  | 'scratch'
  | 'webhooks'
  | 'serialProfiles'
  | 'returnsSuite'
  | 'teamInvites';

export interface PlanLimits {
  /** monthly generated-codes quota; null = unlimited (enterprise) */
  codesPerMonth: number | null;
  scratch: boolean;
  webhooks: boolean;
  serialProfiles: boolean;
  returnsSuite: boolean;
  teamInvites: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    codesPerMonth: 500,
    scratch: false,
    webhooks: false,
    serialProfiles: false,
    returnsSuite: false,
    teamInvites: false,
  },
  starter: {
    codesPerMonth: 5_000,
    scratch: true,
    webhooks: false,
    serialProfiles: false,
    returnsSuite: true,
    teamInvites: false,
  },
  growth: {
    codesPerMonth: 50_000,
    scratch: true,
    webhooks: true,
    serialProfiles: true,
    returnsSuite: true,
    teamInvites: true,
  },
  enterprise: {
    codesPerMonth: null,
    scratch: true,
    webhooks: true,
    serialProfiles: true,
    returnsSuite: true,
    teamInvites: true,
  },
};

/** Unknown/legacy plan strings degrade to the free tier (fail-closed). */
export function planLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan as PlanId] ?? PLAN_LIMITS.free;
}

export function planAllows(plan: string, feature: PlanFeature): boolean {
  return planLimits(plan)[feature];
}

/** Monthly generated-codes quota; null = unlimited. */
export function codesQuota(plan: string): number | null {
  return planLimits(plan).codesPerMonth;
}
