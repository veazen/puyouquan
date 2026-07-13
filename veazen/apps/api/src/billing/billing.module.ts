import { Global, Module } from '@nestjs/common';

import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PlanGateService } from './plan-gate.service';

/**
 * P1 billing (docs/MONETIZATION_PLAN_zh.md): plan gates + Lemon Squeezy
 * subscription sync. Global so PlanGateService injects anywhere a gate is
 * needed (batches, webhooks, serial profiles, returns, invites) without
 * per-module imports — mirroring the RedisModule pattern.
 */
@Global()
@Module({
  controllers: [BillingController],
  providers: [BillingService, PlanGateService],
  exports: [BillingService, PlanGateService],
})
export class BillingModule {}
