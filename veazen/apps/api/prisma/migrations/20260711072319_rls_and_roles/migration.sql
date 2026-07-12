-- ADR-006: tenant isolation & evidence-grade immutability, enforced in the DB.
--
-- The application connects as `veazen_app` (least privilege, no DDL, not the
-- table owner, so RLS applies to it). Migrations run as the owner role.
-- Requests set `app.tenant_id` per transaction (SET LOCAL via set_config):
--   * tenant-scoped work → the tenant's uuid
--   * system paths (public verify lookup by serial, queue workers, digests)
--     → the sentinel '__system__'
-- A connection that sets nothing sees no tenant rows (current_setting(_, true)
-- returns NULL → policy false).

-- 1. Application role -------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'veazen_app') THEN
    -- Always a strong throwaway password: managed platforms (e.g. Neon)
    -- validate role passwords when the transaction's DDL reaches their
    -- control plane at COMMIT — a weak dev password fails the whole
    -- migration there, and no in-transaction fallback can catch it.
    -- Every environment overwrites it right after: production boot rotates
    -- to the MASTER_KEY-derived secret (deploy-boot.mjs), dev/CI pin the
    -- fixed dev password via scripts/pin-dev-app-role.mjs.
    EXECUTE format(
      'CREATE ROLE veazen_app LOGIN PASSWORD %L',
      'Vz1!' || md5(random()::text) || upper(md5(random()::text))
    );
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO veazen_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO veazen_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO veazen_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO veazen_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO veazen_app;

-- The app never touches migration bookkeeping.
REVOKE ALL ON TABLE "_prisma_migrations" FROM veazen_app;

-- 2. Append-only tables (§1.10, §9.9): no UPDATE/DELETE for the app, ever. --
REVOKE UPDATE, DELETE ON TABLE "scan_events" FROM veazen_app;
REVOKE UPDATE, DELETE ON TABLE "audit_logs" FROM veazen_app;
REVOKE UPDATE, DELETE ON TABLE "scan_digests" FROM veazen_app;

-- 3. Row Level Security -----------------------------------------------------
-- Visible when the transaction's app.tenant_id matches the row, or the
-- sentinel '__system__' is set.

ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tenants"
  USING (id::text = current_setting('app.tenant_id', true)
         OR current_setting('app.tenant_id', true) = '__system__')
  WITH CHECK (id::text = current_setting('app.tenant_id', true)
              OR current_setting('app.tenant_id', true) = '__system__');

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'api_keys', 'products', 'batches', 'codes', 'scan_events',
    'audit_logs', 'trace_events', 'alerts', 'wp_sites', 'webhook_endpoints',
    'webhook_deliveries', 'serial_profiles', 'custom_hostnames'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I '
      'USING (tenant_id::text = current_setting(''app.tenant_id'', true) '
      '       OR current_setting(''app.tenant_id'', true) = ''__system__'') '
      'WITH CHECK (tenant_id::text = current_setting(''app.tenant_id'', true) '
      '            OR current_setting(''app.tenant_id'', true) = ''__system__'')',
      t
    );
  END LOOP;
END
$$;

-- risk_signals (deliberately tenant-free), scan_digests and waitlist are
-- system-level tables: no RLS, guarded by role grants alone.
