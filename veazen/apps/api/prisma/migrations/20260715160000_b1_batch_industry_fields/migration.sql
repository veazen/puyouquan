-- B1 (S1 supplements pack, DIRECTIVE_BATCH_R): regulatory batch identity.
-- All columns nullable — the fields are optional for every industry today;
-- industry presets may mark them required later without another migration.
--   lot_code    printed lot / batch number (21 CFR 111 batch records)
--   mfg_date    manufacture date (date-only)
--   expiry_date expiry / best-before date (date-only; API enforces ≥ mfg)
--   coa_key     storage key of the uploaded COA PDF (one per batch,
--               re-upload overwrites the same key)

ALTER TABLE "batches" ADD COLUMN "lot_code" TEXT;
ALTER TABLE "batches" ADD COLUMN "mfg_date" DATE;
ALTER TABLE "batches" ADD COLUMN "expiry_date" DATE;
ALTER TABLE "batches" ADD COLUMN "coa_key" TEXT;
