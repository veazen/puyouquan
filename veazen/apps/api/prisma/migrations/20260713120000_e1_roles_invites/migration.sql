-- Enterprise roadmap E1 — role system + warehouse accounts + team invites
-- (docs/PRODUCT_DECISIONS_zh.md PD-004).
--
-- The enum addition is additive (ADD VALUE); PostgreSQL only forbids *using*
-- a value added inside the current transaction — creating the invites table
-- with a user_role column below does not use it.

-- warehouse: returns-desk-only console account (E1 permission matrix)
ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'warehouse';

-- Team invites: the 32-byte token travels only in the invite email / accept
-- URL — only its sha256 is stored (same posture as api_keys.key_hash).
CREATE TABLE "invites" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invites_token_hash_key" ON "invites"("token_hash");

CREATE INDEX "invites_tenant_id_idx" ON "invites"("tenant_id");

ALTER TABLE "invites" ADD CONSTRAINT "invites_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS: same tenant-isolation policy as every tenant-scoped table (ADR-006).
-- Table privileges for veazen_app arrive via the ALTER DEFAULT PRIVILEGES of
-- the rls_and_roles migration; only the policy needs declaring here.
ALTER TABLE "invites" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "invites"
  USING (tenant_id::text = current_setting('app.tenant_id', true)
         OR current_setting('app.tenant_id', true) = '__system__')
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true)
              OR current_setting('app.tenant_id', true) = '__system__');
