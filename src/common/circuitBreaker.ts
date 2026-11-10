import { logger } from './logger';

export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Simple circuit breaker: after `failureThreshold` consecutive failures the
 * circuit opens for `resetTimeoutMs`, during which calls fail fast. After the
 * timeout a single trial call is allowed (half-open); success closes it.
 */
export class CircuitBreaker {
  private failures = 0;
  private state: CircuitState = 'closed';
  private openedAt = 0;

  constructor(
    private readonly name: string,
    private readonly failureThreshold = 5,
    private readonly resetTimeoutMs = 30_000,
  ) {}

  getState(): CircuitState {
    if (this.state === 'open' && Date.now() - this.openedAt >= this.resetTimeoutMs) {
      this.state = 'half-open';
    }
    return this.state;
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    const state = this.getState();
    if (state === 'open') {
      throw new Error(`Circuit breaker open for ${this.name}`);
    }
    try {
      const result = await fn();
      this.failures = 0;
      this.state = 'closed';
      return result;
    } catch (err) {
      this.failures += 1;
      logger.warn({ breaker: this.name, failures: this.failures, err }, 'Circuit breaker failure');
      if (this.failures >= this.failureThreshold) {
        this.state = 'open';
        this.openedAt = Date.now();
        logger.error({ breaker: this.name }, 'Circuit breaker opened');
      }
      throw err;
    }
  }
}
