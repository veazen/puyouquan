-- additive alert rule for auto-disabled webhook endpoints (see schema comment)
ALTER TYPE "alert_rule" ADD VALUE IF NOT EXISTS 'webhook_failure';
