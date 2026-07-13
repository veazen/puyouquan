import { PLAN_IDS, PLAN_LIMITS, codesQuota, planAllows } from './plans';

/** P1 plan matrix — pin the tier capabilities exactly (MONETIZATION_PLAN §三). */
describe('plans matrix', () => {
  it('free: 500 codes/month, no paid capabilities', () => {
    expect(codesQuota('free')).toBe(500);
    expect(planAllows('free', 'scratch')).toBe(false);
    expect(planAllows('free', 'webhooks')).toBe(false);
    expect(planAllows('free', 'serialProfiles')).toBe(false);
    expect(planAllows('free', 'returnsSuite')).toBe(false);
    expect(planAllows('free', 'teamInvites')).toBe(false);
  });

  it('starter: 5000 codes/month, scratch + returns suite only', () => {
    expect(codesQuota('starter')).toBe(5_000);
    expect(planAllows('starter', 'scratch')).toBe(true);
    expect(planAllows('starter', 'returnsSuite')).toBe(true);
    expect(planAllows('starter', 'webhooks')).toBe(false);
    expect(planAllows('starter', 'serialProfiles')).toBe(false);
    expect(planAllows('starter', 'teamInvites')).toBe(false);
  });

  it('growth: 50000 codes/month, everything except unlimited volume', () => {
    expect(codesQuota('growth')).toBe(50_000);
    expect(planAllows('growth', 'scratch')).toBe(true);
    expect(planAllows('growth', 'webhooks')).toBe(true);
    expect(planAllows('growth', 'serialProfiles')).toBe(true);
    expect(planAllows('growth', 'returnsSuite')).toBe(true);
    expect(planAllows('growth', 'teamInvites')).toBe(true);
  });

  it('enterprise: unlimited codes, every capability', () => {
    expect(codesQuota('enterprise')).toBeNull();
    for (const feature of [
      'scratch',
      'webhooks',
      'serialProfiles',
      'returnsSuite',
      'teamInvites',
    ] as const) {
      expect(planAllows('enterprise', feature)).toBe(true);
    }
  });

  it('unknown plan strings fail closed to the free tier', () => {
    expect(codesQuota('vip-legacy')).toBe(500);
    expect(planAllows('vip-legacy', 'scratch')).toBe(false);
  });

  it('matrix is monotonic: each tier allows at least what the previous one does', () => {
    const features = ['scratch', 'webhooks', 'serialProfiles', 'returnsSuite', 'teamInvites'] as const;
    for (let i = 1; i < PLAN_IDS.length; i += 1) {
      const lower = PLAN_LIMITS[PLAN_IDS[i - 1] as keyof typeof PLAN_LIMITS];
      const higher = PLAN_LIMITS[PLAN_IDS[i] as keyof typeof PLAN_LIMITS];
      for (const feature of features) {
        if (lower[feature]) {
          expect(higher[feature]).toBe(true);
        }
      }
      if (lower.codesPerMonth !== null && higher.codesPerMonth !== null) {
        expect(higher.codesPerMonth).toBeGreaterThan(lower.codesPerMonth);
      }
    }
  });
});
