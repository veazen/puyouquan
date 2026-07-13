import { Injectable, Logger } from '@nestjs/common';

import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { PlanGateService } from './plan-gate.service';
import { codesQuota, planLimits, type PlanId, PLAN_IDS } from './plans';

/** Lemon Squeezy subscription webhook payload (the fields we consume). */
export interface LemonEvent {
  meta?: {
    event_name?: string;
    custom_data?: { tenant_id?: string };
  };
  data?: {
    id?: string | number;
    attributes?: {
      customer_id?: string | number;
      variant_id?: string | number;
      renews_at?: string | null;
      ends_at?: string | null;
      first_subscription_item?: { variant_id?: string | number } | null;
    };
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * P1 billing: console summary + Lemon Squeezy subscription lifecycle.
 * Webhook processing is idempotent — the target state is derived from the
 * event and only written (and audited) when it differs from the current row.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly planGate: PlanGateService,
  ) {}

  /** GET /billing/summary — plan, usage, features, checkout links. */
  async summary(tenantId: string) {
    const tenant = await this.prisma.withTenant(tenantId, (tx) =>
      tx.tenant.findUnique({
        where: { id: tenantId },
        select: { plan: true, planRenewsAt: true },
      }),
    );
    const plan = tenant?.plan ?? 'free';
    const limits = planLimits(plan);
    const codesThisMonth = await this.planGate.codesThisMonth(tenantId);

    // checkout links only for configured plans, each stamped with the tenant
    // id so the webhook can route the subscription back to this tenant
    const checkoutUrls: Record<string, string> = {};
    for (const [planId, rawUrl] of Object.entries(this.config.lemonSqueezyCheckoutUrls)) {
      const url = withTenantCheckoutParam(rawUrl, tenantId);
      if (url) {
        checkoutUrls[planId] = url;
      }
    }

    return {
      plan,
      renews_at: tenant?.planRenewsAt ?? null,
      usage: {
        codes_this_month: codesThisMonth,
        codes_quota: codesQuota(plan), // null = unlimited
      },
      features: {
        scratch: limits.scratch,
        webhooks: limits.webhooks,
        serialProfiles: limits.serialProfiles,
        returnsSuite: limits.returnsSuite,
        teamInvites: limits.teamInvites,
      },
      enforcement: this.planGate.enforced,
      checkout_urls: checkoutUrls,
    };
  }

  /**
   * Apply one verified Lemon Squeezy event. Never throws for business
   * reasons — unroutable/unmapped events are acknowledged (200) and logged
   * so LS does not retry them forever.
   */
  async handleLemonEvent(event: LemonEvent): Promise<{ ok: true; result: string }> {
    const eventName = event.meta?.event_name ?? '';
    if (
      !['subscription_created', 'subscription_updated', 'subscription_cancelled', 'subscription_expired'].includes(
        eventName,
      )
    ) {
      return { ok: true, result: `ignored:${eventName || 'unknown_event'}` };
    }

    const subscriptionId = event.data?.id !== undefined ? String(event.data.id) : null;
    const tenant = await this.locateTenant(event, subscriptionId);
    if (!tenant) {
      this.logger.warn(
        `lemonsqueezy ${eventName}: no tenant matched (custom tenant_id / subscription ${subscriptionId ?? '-'}) — acknowledged and skipped`,
      );
      return { ok: true, result: 'ignored:tenant_not_found' };
    }

    const attributes = event.data?.attributes ?? {};

    if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
      const variantId = attributes.variant_id ?? attributes.first_subscription_item?.variant_id;
      const mapped = variantId !== undefined ? this.config.lemonSqueezyVariantPlanMap[String(variantId)] : undefined;
      const targetPlan = PLAN_IDS.find((p) => p === mapped);
      if (!targetPlan) {
        this.logger.warn(
          `lemonsqueezy ${eventName}: variant ${String(variantId)} not in LEMONSQUEEZY_VARIANT_PLAN_MAP — acknowledged and skipped`,
        );
        return { ok: true, result: 'ignored:variant_unmapped' };
      }
      return this.applyTenantBilling(tenant.id, eventName, subscriptionId, {
        plan: targetPlan,
        lsCustomerId: attributes.customer_id !== undefined ? String(attributes.customer_id) : tenant.lsCustomerId,
        lsSubscriptionId: subscriptionId ?? tenant.lsSubscriptionId,
        planRenewsAt: attributes.renews_at ? new Date(attributes.renews_at) : null,
      });
    }

    if (eventName === 'subscription_cancelled') {
      // grace period: the tier survives until the paid-for period ends
      return this.applyTenantBilling(tenant.id, eventName, subscriptionId, {
        plan: tenant.plan as PlanId,
        lsCustomerId: tenant.lsCustomerId,
        lsSubscriptionId: tenant.lsSubscriptionId,
        planRenewsAt: attributes.ends_at ? new Date(attributes.ends_at) : tenant.planRenewsAt,
      });
    }

    // subscription_expired: drop back to free, unlink the subscription
    return this.applyTenantBilling(tenant.id, eventName, subscriptionId, {
      plan: 'free',
      lsCustomerId: tenant.lsCustomerId,
      lsSubscriptionId: null,
      planRenewsAt: null,
    });
  }

  private async locateTenant(event: LemonEvent, subscriptionId: string | null) {
    const customTenantId = event.meta?.custom_data?.tenant_id;
    return this.prisma.asSystem(async (sys) => {
      if (customTenantId && UUID_RE.test(customTenantId)) {
        const byId = await sys.tenant.findUnique({
          where: { id: customTenantId },
          select: TENANT_BILLING_SELECT,
        });
        if (byId) {
          return byId;
        }
      }
      if (subscriptionId) {
        return sys.tenant.findFirst({
          where: { lsSubscriptionId: subscriptionId },
          select: TENANT_BILLING_SELECT,
        });
      }
      return null;
    });
  }

  /**
   * Write the derived billing state + audit log in one tenant-scoped
   * transaction. Idempotent: a replayed event derives the same target state,
   * which then differs in nothing → no write, no duplicate audit row.
   */
  private async applyTenantBilling(
    tenantId: string,
    eventName: string,
    subscriptionId: string | null,
    target: {
      plan: PlanId;
      lsCustomerId: string | null;
      lsSubscriptionId: string | null;
      planRenewsAt: Date | null;
    },
  ): Promise<{ ok: true; result: string }> {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const current = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: TENANT_BILLING_SELECT,
      });
      if (!current) {
        return { ok: true as const, result: 'ignored:tenant_not_found' };
      }
      const unchanged =
        current.plan === target.plan &&
        current.lsCustomerId === target.lsCustomerId &&
        current.lsSubscriptionId === target.lsSubscriptionId &&
        (current.planRenewsAt?.getTime() ?? null) === (target.planRenewsAt?.getTime() ?? null);
      if (unchanged) {
        return { ok: true as const, result: 'noop' };
      }
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          plan: target.plan,
          lsCustomerId: target.lsCustomerId,
          lsSubscriptionId: target.lsSubscriptionId,
          planRenewsAt: target.planRenewsAt,
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          // machine event — no human actor; the target payload carries the evidence
          action: current.plan === target.plan ? 'billing.subscription_updated' : 'billing.plan_changed',
          target: {
            from_plan: current.plan,
            to_plan: target.plan,
            event: eventName,
            subscription_id: subscriptionId,
            renews_at: target.planRenewsAt?.toISOString() ?? null,
          },
        },
      });
      this.logger.log(
        `lemonsqueezy ${eventName}: tenant ${tenantId} plan ${current.plan} → ${target.plan} (subscription ${subscriptionId ?? '-'})`,
      );
      return { ok: true as const, result: `applied:${target.plan}` };
    });
  }
}

const TENANT_BILLING_SELECT = {
  id: true,
  plan: true,
  lsCustomerId: true,
  lsSubscriptionId: true,
  planRenewsAt: true,
} as const;

/**
 * Append `checkout[custom][tenant_id]=<tenantId>` to a hosted checkout URL.
 * Returns null when the configured value is not a parseable URL.
 */
export function withTenantCheckoutParam(rawUrl: string, tenantId: string): string | null {
  try {
    const url = new URL(rawUrl);
    url.searchParams.set('checkout[custom][tenant_id]', tenantId);
    return url.toString();
  } catch {
    return null;
  }
}
