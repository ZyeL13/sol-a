import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../src/common/eventBus';

describe('EventBus deduplication', () => {
  it('drops a duplicate event id within the TTL', () => {
    const bus = new EventBus({ ttlMs: 60_000 });
    const event = { id: 'e1', type: 'test', mint: 'm1', timestamp: new Date(), payload: {} };
    expect(bus.publish(event)).toBe(true);
    expect(bus.publish(event)).toBe(false);
    expect(bus.seenCount()).toBe(1);
  });

  it('accepts the same id after the TTL expires', () => {
    const bus = new EventBus({ ttlMs: 10 });
    const event = { id: 'e1', type: 'test', mint: 'm1', timestamp: new Date(), payload: {} };
    bus.publish(event);
    bus.prune(Date.now() + 1000);
    expect(bus.publish(event)).toBe(true);
  });

  it('delivers events to subscribers and isolates handler errors', async () => {
    const bus = new EventBus();
    const ok = vi.fn();
    bus.subscribe('test', () => {
      throw new Error('boom');
    });
    bus.subscribe('test', ok);
    bus.publish({ id: 'e2', type: 'test', mint: 'm1', timestamp: new Date(), payload: { v: 1 } });
    await new Promise((r) => setTimeout(r, 20));
    expect(ok).toHaveBeenCalledTimes(1);
  });

  it('evicts the oldest entry when the store is full', () => {
    const bus = new EventBus({ maxEntries: 2 });
    for (const id of ['a', 'b', 'c']) {
      bus.publish({ id, type: 'test', mint: 'm', timestamp: new Date(), payload: {} });
    }
    expect(bus.seenCount()).toBe(2);
  });
});
