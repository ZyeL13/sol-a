import { DataUnavailableError, RateLimitError } from './errors';

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Jitter factor 0-1 applied to the delay. */
  jitter?: number;
}

/**
 * Exponential backoff with jitter. Only retries errors flagged retryable
 * (or HTTP 429 / 5xx surfaced as RateLimitError / DataUnavailableError).
 * Non-retryable errors are rethrown immediately.
 */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 200, maxDelayMs = 5000, jitter = 0.2 } = opts;
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      const retryable =
        err instanceof RateLimitError ||
        err instanceof DataUnavailableError ||
        (err instanceof Error && (err as Error & { retryable?: boolean }).retryable === true);
      if (!retryable || attempt >= maxAttempts) throw err;
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const jittered = delay * (1 + (Math.random() * 2 - 1) * jitter);
      const wait = err instanceof RateLimitError && err.retryAfterMs ? err.retryAfterMs : jittered;
      await sleep(Math.max(0, wait));
    }
  }
}
