import { logger } from '../common/logger';
import { withRetry } from '../common/retry';
import { CircuitBreaker } from '../common/circuitBreaker';
import { DataUnavailableError, RateLimitError } from '../common/errors';
import type { SecurityProvider } from './types';

/**
 * Minimal fetch-based HTTP client shared by the security providers.
 * Handles 429 (rate limit) and 5xx (retryable) explicitly; 4xx is a
 * permanent failure for that request.
 */
export async function fetchJson(url: string, init: RequestInit = {}, timeoutMs = 10_000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (res.status === 429) {
      const retryAfter = res.headers.get('retry-after');
      throw new RateLimitError(
        `Rate limited by ${url}`,
        retryAfter ? Number(retryAfter) * 1000 : undefined,
      );
    }
    if (res.status >= 500) throw new DataUnavailableError(`Upstream ${res.status} from ${url}`);
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

/** Base class: retry + circuit breaker around a provider fetch. */
export abstract class HttpSecurityProvider implements SecurityProvider {
  protected readonly breaker: CircuitBreaker;

  constructor(public readonly name: string) {
    this.breaker = new CircuitBreaker(name, 5, 30_000);
  }

  protected abstract buildUrl(mint: string): string;
  protected abstract buildInit(): RequestInit;

  async fetch(mint: string): Promise<unknown | null> {
    try {
      return await this.breaker.call(() =>
        withRetry(() => fetchJson(this.buildUrl(mint), this.buildInit()), { maxAttempts: 3 }),
      );
    } catch (err) {
      logger.warn({ provider: this.name, mint, err }, 'Security provider unavailable');
      return null;
    }
  }
}
