/*
 * Automatic sync retries back off exponentially, so a flaky connection is not hammered and a long outage costs only
 * a few quiet attempts: about 5s, 10s, 20s, 40s, 80s, 160s, then every 5 minutes. Each wait is spread by ±20% so
 * many devices coming back at once do not all retry together. Coming back online or to the foreground tries at once.
 */
export const RETRY_BASE_MS = 5000;
export const RETRY_MAX_MS = 5 * 60 * 1000;
const JITTER = 0.2;

/** Wait before automatic attempt number `attempt` (0 = first retry). `random` returns [0, 1). */
export function retryDelay(attempt, random = Math.random) {
  const n = Number.isSafeInteger(attempt) && attempt > 0 ? Math.min(attempt, 30) : 0;
  const plain = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** n);
  const spread = plain * JITTER * (Math.min(Math.max(Number(random()) || 0, 0), 1) * 2 - 1);
  return Math.round(Math.min(RETRY_MAX_MS, Math.max(RETRY_BASE_MS * (1 - JITTER), plain + spread)));
}
