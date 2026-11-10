import { describe, expect, it } from 'vitest';
import { CircuitBreaker } from '../../src/common/circuitBreaker';
import { withRetry } from '../../src/common/retry';
import { DataUnavailableError } from '../../src/common/errors';

describe('withRetry', () => {
  it('retries a retryable error and succeeds', async () => {
    let calls = 0;
    const result = await withRetry(async () => {
      calls += 1;
      if (calls < 3) throw new DataUnavailableError('flaky');
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(calls).toBe(3);
  });

  it('does not retry a non-retryable error', async () => {
    let calls = 0;
    await expect(
      withRetry(async () => {
        calls += 1;
        throw new Error('permanent');
      }),
    ).rejects.toThrow('permanent');
    expect(calls).toBe(1);
  });

  it('gives up after maxAttempts', async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new DataUnavailableError('always down');
        },
        { maxAttempts: 2, baseDelayMs: 1 },
      ),
    ).rejects.toThrow('always down');
    expect(calls).toBe(2);
  });
});

describe('CircuitBreaker', () => {
  it('opens after the failure threshold and fails fast', async () => {
    const breaker = new CircuitBreaker('test', 2, 60_000);
    await expect(breaker.call(async () => { throw new Error('x'); })).rejects.toThrow('x');
    await expect(breaker.call(async () => { throw new Error('x'); })).rejects.toThrow('x');
    expect(breaker.getState()).toBe('open');
    await expect(breaker.call(async () => 'ok')).rejects.toThrow(/Circuit breaker open/);
  });

  it('closes again after a successful half-open trial', async () => {
    const breaker = new CircuitBreaker('test', 1, 100);
    await expect(breaker.call(async () => { throw new Error('x'); })).rejects.toThrow('x');
    expect(breaker.getState()).toBe('open');
    await new Promise((r) => setTimeout(r, 150));
    expect(await breaker.call(async () => 'ok')).toBe('ok');
    expect(breaker.getState()).toBe('closed');
  });
});
