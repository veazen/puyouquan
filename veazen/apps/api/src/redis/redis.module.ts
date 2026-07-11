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
      useFactory: (config: AppConfigService) =>
        new Redis(config.redisUrl, { maxRetriesPerRequest: null }),
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
