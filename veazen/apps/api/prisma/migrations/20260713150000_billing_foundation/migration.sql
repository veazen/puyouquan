-- P1 收款闭环 (docs/MONETIZATION_PLAN_zh.md, PD-005): Lemon Squeezy
-- subscription linkage on tenants. All three columns are nullable — existing
-- tenants stay untouched; only the LS webhook (billing module) writes them.
-- No role DDL, no RLS changes (the tenants policy from rls_and_roles covers
-- these columns automatically).

ALTER TABLE "tenants" ADD COLUMN "ls_customer_id" TEXT;
ALTER TABLE "tenants" ADD COLUMN "ls_subscription_id" TEXT;
ALTER TABLE "tenants" ADD COLUMN "plan_renews_at" TIMESTAMP(3);
