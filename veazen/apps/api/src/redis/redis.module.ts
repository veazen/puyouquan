import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';

import { AppConfigService } from '../config/app-config.service';
import { RateLimitService } from './rate-limit.service';
import { REDIS } from './redis.constants';

export { REDIS } from './redis.constants';

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      // family: 0 — dual-stack DNS lookup; Railway's private network is
      // IPv6-only and ioredis defaults to IPv4-only, which resolves to
      // ENOTFOUND. Fail fast instead of queueing commands forever: rate
      // limiting must degrade (fail-open in RateLimitService), never hang
      // the request path.
      useFactory: (config: AppConfigService) =>
        new Redis(config.redisUrl, {
          family: 0,
          maxRetriesPerRequest: 2,
          enableOfflineQueue: false,
        }),
      inject: [AppConfigService],
    },
    RateLimitService,
  ],
  exports: [REDIS, RateLimitService],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(private readonly rateLimit: RateLimitService) {}

  async onApplicationShutdown(): Promise<void> {
    await this.rateLimit.quit();
  }
}
