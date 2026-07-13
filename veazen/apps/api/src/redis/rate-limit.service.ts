import { randomBytes } from 'node:crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';

import { REDIS } from './redis.constants';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * Redis sliding-window rate limiter (§9.3) — sorted set per key, scored by
 * timestamp; atomic via MULTI. Also provides the fixed lockout counter used
 * by the scratch endpoint (5 attempts per serial → 1h lock, §5.1).
 *
 * Fail-open by design: rate limiting is abuse protection, not authentication.
 * When Redis is unreachable the public verify/login paths must keep serving
 * (2026-07-13 incident: an unreachable Redis hung every rate-limited request),
 * so Redis errors log a warning and let the request through.
 */
@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async hit(bucket: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const key = `rl:${bucket}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    const member = `${now}:${randomBytes(4).toString('hex')}`;

    try {
      const [, , countReply] = (await this.redis
        .multi()
        .zremrangebyscore(key, 0, windowStart)
        .zadd(key, now, member)
        .zcard(key)
        .expire(key, windowSeconds + 1)
        .exec()) as Array<[Error | null, unknown]>;

      const count = Number(countReply?.[1] ?? 0);
      if (count > limit) {
        // over limit — remove our own member so probes don't extend the window load
        await this.redis.zrem(key, member);
        return { allowed: false, remaining: 0 };
      }
      return { allowed: true, remaining: Math.max(0, limit - count) };
    } catch (error) {
      this.logger.warn(`rate limit degraded (fail-open): ${(error as Error).message}`);
      return { allowed: true, remaining: limit };
    }
  }

  /** Counter with TTL: returns the count after increment. */
  async lockoutHit(bucket: string, ttlSeconds: number): Promise<number> {
    try {
      const key = `lock:${bucket}`;
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, ttlSeconds);
      }
      return count;
    } catch (error) {
      this.logger.warn(`lockout counter degraded (fail-open): ${(error as Error).message}`);
      return 1;
    }
  }

  async isLockedOut(bucket: string, threshold: number): Promise<boolean> {
    try {
      const value = await this.redis.get(`lock:${bucket}`);
      return value !== null && Number(value) >= threshold;
    } catch (error) {
      this.logger.warn(`lockout check degraded (fail-open): ${(error as Error).message}`);
      return false;
    }
  }

  async quit(): Promise<void> {
    try {
      await this.redis.quit();
    } catch {
      this.redis.disconnect();
    }
  }
}
