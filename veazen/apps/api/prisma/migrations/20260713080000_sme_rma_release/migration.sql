-- SME suite batch 1 — M2 returns/RMA + M3 warehouse release
-- (docs/SME_SUITE_PLAN_zh.md §二/§三, PD-002/PD-003).
--
-- All enum additions are additive (ADD VALUE); PostgreSQL only forbids using
-- a value added inside the current transaction, and nothing below does.

-- code lifecycle: relabel retires the old code; brand QC resale = refurbished
ALTER TYPE "code_status" ADD VALUE IF NOT EXISTS 'retired';
ALTER TYPE "code_status" ADD VALUE IF NOT EXISTS 'refurbished';

-- scans of retired/refurbished codes book their own results so statistics and
-- the refurbished "verified N times" history count stay unpolluted
ALTER TYPE "scan_result" ADD VALUE IF NOT EXISTS 'retired';
ALTER TYPE "scan_result" ADD VALUE IF NOT EXISTS 'refurbished';

-- RMA / release lifecycle reuses trace_events (plan §三 item 5)
ALTER TYPE "trace_event_type" ADD VALUE IF NOT EXISTS 'returned';
ALTER TYPE "trace_event_type" ADD VALUE IF NOT EXISTS 'released';
ALTER TYPE "trace_event_type" ADD VALUE IF NOT EXISTS 'relabeled';

-- risk rules: locked Lite code rescanned from another device fingerprint;
-- the same code released for resale ≥ 3 times
ALTER TYPE "alert_rule" ADD VALUE IF NOT EXISTS 'lite_duplicate_scan';
ALTER TYPE "alert_rule" ADD VALUE IF NOT EXISTS 'release_abuse';

-- relabel chain (old code → its replacement) + release-for-resale counter
ALTER TABLE "codes"
  ADD COLUMN "replaced_by_id" UUID,
  ADD COLUMN "release_count" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "codes" ADD CONSTRAINT "codes_replaced_by_id_fkey"
  FOREIGN KEY ("replaced_by_id") REFERENCES "codes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
