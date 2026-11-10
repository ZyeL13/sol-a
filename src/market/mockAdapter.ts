import type { MarketDataAdapter } from './adapter';
import type { MarketEvent } from '../common/eventBus';
import type { DiscoveryEventPayload, PoolInfo, TokenInfo } from './types';
import { discoveryEventId } from './adapter';

/** Deterministic in-memory source used by tests and local demos. */
export class MockAdapter implements MarketDataAdapter {
  readonly name = 'mock';
  private stopped = false;

  constructor(private readonly fixtures: Array<{ token: TokenInfo; pool: PoolInfo }>) {}

  async start(onEvent: (event: MarketEvent<DiscoveryEventPayload>) => void): Promise<void> {
    this.stopped = false;
    for (const { token, pool } of this.fixtures) {
      if (this.stopped) break;
      const now = Date.now();
      onEvent({
        id: discoveryEventId('pool_created', token.mint, now),
        type: 'discovery.pool_created',
        mint: token.mint,
        timestamp: new Date(now),
        payload: { kind: 'pool_created', token, pool },
      });
      // Yield so subscribers can process between fixtures.
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  async stop(): Promise<void> {
    this.stopped = true;
  }
}
