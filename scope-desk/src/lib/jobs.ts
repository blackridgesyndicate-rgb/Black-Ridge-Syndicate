import "server-only";

/**
 * Background job execution abstraction. This environment has no queue
 * infrastructure (Redis/SQS) available, so jobs run in-process immediately
 * and are simply awaited by the caller. Every call site goes through this
 * function so swapping in a real queue (BullMQ, etc.) later only requires
 * changing this one implementation, not any call sites.
 */
export async function runJob<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    return result;
  } catch (err) {
    console.error(`[job:${name}] failed after ${Date.now() - start}ms`, err);
    throw err;
  }
}
