import { Logger } from '@nestjs/common';
import type { JobsOptions, Queue } from 'bullmq';

const logger = new Logger('QueueAdd');

/** How long a request path may wait for Redis before giving up. */
export const QUEUE_ADD_TIMEOUT_MS = 2000;

/**
 * queue.add that cannot hang a request path: with Redis unreachable, BullMQ
 * commands sit in ioredis' offline queue indefinitely (2026-07-13 incident).
 * Returns true when enqueued, false on timeout or error (logged, never
 * throws).
 *
 * On false the job may STILL land later — the offline-queued command flushes
 * when the connection recovers (self-heal) — but only if the process
 * survives until then. Callers treat false as "not durably queued".
 */
export async function tryQueueAdd<DataType>(
  queue: Queue<DataType>,
  name: string,
  data: DataType,
  opts?: JobsOptions,
): Promise<boolean> {
  // localized cast: bullmq's ExtractNameType conditional generic rejects a
  // plain string name even though that is exactly what runtime add() takes
  const add = queue.add.bind(queue) as (
    n: string,
    d: DataType,
    o?: JobsOptions,
  ) => Promise<unknown>;
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), QUEUE_ADD_TIMEOUT_MS);
  });
  try {
    const enqueued = await Promise.race([add(name, data, opts).then(() => true as const), timeout]);
    if (!enqueued) {
      logger.warn(`queue ${queue.name}: enqueue "${name}" timed out — redis degraded, job not durably queued`);
    }
    return enqueued;
  } catch (error) {
    logger.warn(`queue ${queue.name}: enqueue "${name}" failed: ${(error as Error).message}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}
