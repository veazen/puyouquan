-- A3 (指令批次 R): 卡死批次补偿。
-- batch_status 增加 'failed'（补偿扫描 ≥3 次仍卡死 → failed，控制台给出
-- 明确文案与「重试」入口，绝不静默卡死）；batches 增加补偿重试计数列。
-- 无角色 DDL、无 RLS 变更（rls_and_roles 的 batches 策略自动覆盖新列）。
-- PG 12+ 允许在事务内 ALTER TYPE ADD VALUE，只要同一事务不使用新值——
-- 本迁移不使用它。

ALTER TYPE "batch_status" ADD VALUE IF NOT EXISTS 'failed';

ALTER TABLE "batches" ADD COLUMN "generation_attempts" INTEGER NOT NULL DEFAULT 0;
