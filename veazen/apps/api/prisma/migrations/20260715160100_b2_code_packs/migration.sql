-- B2 code packs (DIRECTIVE_BATCH_R): one-time overflow credits on top of the
-- monthly subscription quota. Rows are created by the Lemon Squeezy
-- `order_created` webhook (ls_order_id deduplicates replays) and consumed
-- FIFO by purchased_at when a batch generation completes.

CREATE TABLE "code_packs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "quantity_purchased" INTEGER NOT NULL,
    "quantity_remaining" INTEGER NOT NULL,
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "ls_order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "code_packs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "code_packs_ls_order_id_key" ON "code_packs"("ls_order_id");

CREATE INDEX "code_packs_tenant_id_idx" ON "code_packs"("tenant_id");

ALTER TABLE "code_packs" ADD CONSTRAINT "code_packs_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS: same tenant-isolation policy as every tenant-scoped table (ADR-006).
-- Table privileges for veazen_app arrive via the ALTER DEFAULT PRIVILEGES of
-- the rls_and_roles migration; only the policy needs declaring here.
ALTER TABLE "code_packs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "code_packs"
  USING (tenant_id::text = current_setting('app.tenant_id', true)
         OR current_setting('app.tenant_id', true) = '__system__')
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true)
              OR current_setting('app.tenant_id', true) = '__system__');
