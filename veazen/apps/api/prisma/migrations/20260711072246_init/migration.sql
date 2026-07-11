-- CreateEnum
CREATE TYPE "tenant_plan" AS ENUM ('free', 'starter', 'growth', 'enterprise');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('owner', 'admin', 'viewer');

-- CreateEnum
CREATE TYPE "batch_status" AS ENUM ('pending', 'generating', 'ready', 'exported');

-- CreateEnum
CREATE TYPE "batch_kind" AS ENUM ('bulk', 'on_demand');

-- CreateEnum
CREATE TYPE "export_format" AS ENUM ('csv', 'pdf');

-- CreateEnum
CREATE TYPE "code_status" AS ENUM ('inactive', 'active', 'verified', 'flagged', 'voided');

-- CreateEnum
CREATE TYPE "flag_reason" AS ENUM ('risk_rule', 'stolen', 'recalled', 'manual');

-- CreateEnum
CREATE TYPE "scan_kind" AS ENUM ('public_scan', 'scratch_verify', 'activation', 'inspector_scan');

-- CreateEnum
CREATE TYPE "scan_result" AS ENUM ('ok', 'already_verified', 'invalid', 'inactive', 'flagged');

-- CreateEnum
CREATE TYPE "signal_type" AS ENUM ('suspicious_device_fp', 'hot_geo_cell', 'invalid_serial_probe_source');

-- CreateEnum
CREATE TYPE "trace_subject" AS ENUM ('batch', 'code');

-- CreateEnum
CREATE TYPE "trace_event_type" AS ENUM ('commissioned', 'quality_checked', 'shipped', 'received', 'activated', 'retail_activated', 'custom');

-- CreateEnum
CREATE TYPE "trace_source" AS ENUM ('api', 'dashboard', 'wp_plugin', 'csv_import');

-- CreateEnum
CREATE TYPE "alert_rule" AS ENUM ('duplicate_scratch', 'geo_velocity', 'out_of_market', 'scan_burst');

-- CreateEnum
CREATE TYPE "alert_severity" AS ENUM ('info', 'warning', 'critical');

-- CreateEnum
CREATE TYPE "serial_profile_mode" AS ENUM ('platform', 'custom_format', 'byo');

-- CreateEnum
CREATE TYPE "serial_charset" AS ENUM ('crockford32', 'upper_alnum', 'digits');

-- CreateEnum
CREATE TYPE "serial_profile_status" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "hostname_status" AS ENUM ('pending_dns', 'verifying', 'active', 'failed');

-- CreateEnum
CREATE TYPE "tls_status" AS ENUM ('pending', 'issued', 'renewing', 'failed');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "tenant_plan" NOT NULL DEFAULT 'free',
    "custom_domain" TEXT,
    "public_key" BYTEA NOT NULL,
    "encrypted_private_key" BYTEA NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'owner',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "gtin" TEXT,
    "description" TEXT,
    "images" JSONB NOT NULL DEFAULT '[]',
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "trace_template_id" UUID,
    "external_refs" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "batch_status" NOT NULL DEFAULT 'pending',
    "kind" "batch_kind" NOT NULL DEFAULT 'bulk',
    "auto_activate" BOOLEAN NOT NULL DEFAULT false,
    "export_format" "export_format" NOT NULL DEFAULT 'csv',
    "intended_market" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activated_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "serial" TEXT NOT NULL,
    "sig" TEXT NOT NULL,
    "scratch_hash" TEXT,
    "status" "code_status" NOT NULL DEFAULT 'inactive',
    "flag_reason" "flag_reason",
    "prev_status" "code_status",
    "first_verified_at" TIMESTAMP(3),
    "scratch_redeemed_at" TIMESTAMP(3),
    "order_ref" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_events" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code_id" UUID,
    "kind" "scan_kind" NOT NULL,
    "result" "scan_result" NOT NULL,
    "ip" TEXT,
    "geo" JSONB,
    "device_fp" TEXT,
    "user_agent" TEXT,
    "locale" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_digests" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "event_count" BIGINT NOT NULL,
    "merkle_root" TEXT NOT NULL,
    "prev_digest_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_digests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_signals" (
    "id" UUID NOT NULL,
    "signal_type" "signal_type" NOT NULL,
    "signal_value" TEXT NOT NULL,
    "evidence_count" INTEGER NOT NULL DEFAULT 0,
    "tenant_count" INTEGER NOT NULL DEFAULT 0,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "actor_api_key_id" UUID,
    "action" TEXT NOT NULL,
    "target" JSONB NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trace_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "subject" "trace_subject" NOT NULL,
    "subject_id" UUID NOT NULL,
    "event_type" "trace_event_type" NOT NULL,
    "biz_step" TEXT,
    "location" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "source" "trace_source" NOT NULL DEFAULT 'api',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trace_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "rule" "alert_rule" NOT NULL,
    "severity" "alert_severity" NOT NULL,
    "code_id" UUID,
    "batch_id" UUID,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "acknowledged_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wp_sites" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "site_url" TEXT NOT NULL,
    "site_hash" TEXT NOT NULL,
    "plugin_version" TEXT,
    "wc_version" TEXT,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wp_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "encrypted_secret" TEXT NOT NULL,
    "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "endpoint_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "response_status" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "serial_profiles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "serial_profile_mode" NOT NULL DEFAULT 'platform',
    "prefix" TEXT,
    "length" INTEGER NOT NULL,
    "charset" "serial_charset" NOT NULL DEFAULT 'crockford32',
    "random_bits" INTEGER NOT NULL,
    "display_group_size" INTEGER NOT NULL DEFAULT 5,
    "status" "serial_profile_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "serial_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_hostnames" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "hostname" TEXT NOT NULL,
    "dns_ownership_token" TEXT NOT NULL,
    "status" "hostname_status" NOT NULL DEFAULT 'pending_dns',
    "tls_status" "tls_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_hostnames_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "brand" TEXT,
    "website" TEXT,
    "category" TEXT,
    "monthly_units" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "api_keys_key_prefix_idx" ON "api_keys"("key_prefix");

-- CreateIndex
CREATE INDEX "api_keys_tenant_id_idx" ON "api_keys"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenant_id_sku_key" ON "products"("tenant_id", "sku");

-- CreateIndex
CREATE INDEX "batches_tenant_id_status_idx" ON "batches"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "codes_serial_key" ON "codes"("serial");

-- CreateIndex
CREATE INDEX "codes_tenant_id_batch_id_idx" ON "codes"("tenant_id", "batch_id");

-- CreateIndex
CREATE INDEX "codes_tenant_id_status_idx" ON "codes"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "scan_events_tenant_id_created_at_idx" ON "scan_events"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "scan_events_code_id_created_at_idx" ON "scan_events"("code_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "scan_digests_date_key" ON "scan_digests"("date");

-- CreateIndex
CREATE UNIQUE INDEX "risk_signals_signal_type_signal_value_key" ON "risk_signals"("signal_type", "signal_value");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_created_at_idx" ON "audit_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "trace_events_tenant_id_subject_subject_id_idx" ON "trace_events"("tenant_id", "subject", "subject_id");

-- CreateIndex
CREATE INDEX "alerts_tenant_id_acknowledged_at_idx" ON "alerts"("tenant_id", "acknowledged_at");

-- CreateIndex
CREATE UNIQUE INDEX "wp_sites_tenant_id_site_hash_key" ON "wp_sites"("tenant_id", "site_hash");

-- CreateIndex
CREATE INDEX "webhook_endpoints_tenant_id_idx" ON "webhook_endpoints"("tenant_id");

-- CreateIndex
CREATE INDEX "webhook_deliveries_tenant_id_created_at_idx" ON "webhook_deliveries"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "serial_profiles_tenant_id_status_idx" ON "serial_profiles"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "custom_hostnames_hostname_key" ON "custom_hostnames"("hostname");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_email_key" ON "waitlist"("email");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codes" ADD CONSTRAINT "codes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codes" ADD CONSTRAINT "codes_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codes" ADD CONSTRAINT "codes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_events" ADD CONSTRAINT "scan_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trace_events" ADD CONSTRAINT "trace_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wp_sites" ADD CONSTRAINT "wp_sites_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_profiles" ADD CONSTRAINT "serial_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_hostnames" ADD CONSTRAINT "custom_hostnames_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
