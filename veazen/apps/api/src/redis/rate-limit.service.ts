import { randomBytes } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
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
 */
@Injectable()
export class RateLimitService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async hit(bucket: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const key = `rl:${bucket}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    const member = `${now}:${randomBytes(4).toString('hex')}`;

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
  }

  /** Counter with TTL: returns the count after increment. */
  async lockoutHit(bucket: string, ttlSeconds: number): Promise<number> {
    const key = `lock:${bucket}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, ttlSeconds);
    }
    return count;
  }

  async isLockedOut(bucket: string, threshold: number): Promise<boolean> {
    const value = await this.redis.get(`lock:${bucket}`);
    return value !== null && Number(value) >= threshold;
  }

  async quit(): Promise<void> {
    await this.redis.quit();
  }
}
