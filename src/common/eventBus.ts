import { EventEmitter } from 'node:events';
import { logger } from './logger';

/** Every event flowing through the system carries this envelope. */
export interface MarketEvent<T = unknown> {
  /** Stable idempotency key: `${type}:${mint}:${slot}` (or a source-provided id). */
  id: string;
  type: string;
  mint: string;
  timestamp: Date;
  payload: T;
}

/**
 * Async, in-process event bus with deduplication. Handlers run in order and
 * errors are logged, never swallowed silently. A handler throwing does not
 * block other handlers.
 *
 * Idempotency: an event id seen within the TTL window is dropped. The store
 * is bounded (oldest entries evicted) so long-running processes do not leak.
 */
export class EventBus extends EventEmitter {
  private readonly seen = new Map<string, number>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(opts: { ttlMs?: number; maxEntries?: number } = {}) {
    super();
    this.ttlMs = opts.ttlMs ?? 5 * 60_000;
    this.maxEntries = opts.maxEntries ?? 10_000;
    this.setMaxListeners(50);
  }

  /** Publish an event. Returns false when the event is a duplicate. */
  publish<T>(event: MarketEvent<T>): boolean {
    const now = Date.now();
    const seenAt = this.seen.get(event.id);
    if (seenAt !== undefined && now - seenAt < this.ttlMs) {
      logger.debug({ eventId: event.id, type: event.type }, 'Duplicate event dropped');
      return false;
    }
    this.seen.set(event.id, now);
    if (this.seen.size > this.maxEntries) {
      // Evict the oldest entry (Map preserves insertion order).
      const oldest = this.seen.keys().next().value as string;
      this.seen.delete(oldest);
    }
    this.emit(event.type, event);
    this.emit('*', event);
    return true;
  }

  /** Subscribe to one event type. */
  subscribe<T>(type: string, handler: (event: MarketEvent<T>) => Promise<void> | void): void {
    this.on(type, (event: MarketEvent<T>) => {
      Promise.resolve()
        .then(() => handler(event))
        .catch((err) => logger.error({ err, type, eventId: event.id }, 'Event handler failed'));
    });
  }

  /** For tests: how many distinct event ids are currently tracked. */
  seenCount(): number {
    return this.seen.size;
  }

  /** For tests: prune entries older than the TTL. */
  prune(now = Date.now()): void {
    for (const [id, at] of this.seen) {
      if (now - at >= this.ttlMs) this.seen.delete(id);
    }
  }
}
