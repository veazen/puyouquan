import { Redis } from 'ioredis';

/**
 * Every e2e suite shares one client IP, so the abuse-protection buckets
 * (`rl:*` sliding windows, `lock:*` counters — RateLimitService) accumulate
 * across suites and can 429 later scratch/verify calls. Suites that exercise
 * the consumer path but are NOT testing rate limiting flush the buckets at
 * their boundaries so they neither inherit nor bequeath a spent budget.
 */
export async function flushRateLimitBuckets(): Promise<void> {
  const redis = new Redis(process.env.REDIS_URL as string);
  try {
    const keys = [...(await redis.keys('rl:*')), ...(await redis.keys('lock:*'))];
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } finally {
    redis.disconnect();
  }
}
