import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AuditInterceptor } from './audit/audit.interceptor';
import { AuthModule } from './auth/auth.module';
import { BatchesModule } from './batches/batches.module';
import { BillingModule } from './billing/billing.module';
import { CodesController } from './codes/codes.controller';
import { OrdersController } from './codes/orders.controller';
import { ConfigModule } from './config/config.module';
import { DigestService } from './digests/digest.service';
import { HealthModule } from './health/health.module';
import {
  AlertsController,
  SerialProfilesController,
  StatsController,
  TraceEventsController,
  WpController,
} from './misc/misc.controllers';
import { TenantController } from './misc/tenant.controller';
import { WaitlistController } from './misc/waitlist.controller';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsController } from './products/products.controller';
import { QueuesModule } from './queues/queues.module';
import { RedisModule } from './redis/redis.module';
import { AlertsService } from './risk/alerts.service';
import { NotificationService } from './risk/notification.service';
import { RiskWorker } from './risk/risk.worker';
import { ScanContextService } from './verify/scan-context.service';
import { VerifyController } from './verify/verify.controller';
import { VerifyService } from './verify/verify.service';
import { WebhookDispatcher } from './webhooks/webhook.dispatcher';
import { WebhookWorker } from './webhooks/webhook.worker';
import { WebhooksController } from './webhooks/webhooks.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    QueuesModule,
    AuthModule,
    BillingModule,
    BatchesModule,
    HealthModule,
  ],
  controllers: [
    ProductsController,
    CodesController,
    OrdersController,
    VerifyController,
    WebhooksController,
    TraceEventsController,
    AlertsController,
    StatsController,
    WpController,
    SerialProfilesController,
    TenantController,
    WaitlistController,
  ],
  providers: [
    VerifyService,
    ScanContextService,
    WebhookDispatcher,
    WebhookWorker,
    AlertsService,
    NotificationService,
    RiskWorker,
    DigestService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
