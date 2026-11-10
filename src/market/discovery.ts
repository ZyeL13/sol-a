import { EventBus } from '../common/eventBus';
import { logger } from '../common/logger';
import type { StrategyConfig } from '../config/strategy.config';
import type { MarketDataAdapter } from './adapter';
import { applyDiscoveryFilters } from './filters';
import type { DiscoveryEventPayload, PoolInfo } from './types';

/**
 * Discovery engine: consumes adapter events, applies the initial filters,
 * deduplicates (via the EventBus) and republishes only tokens that pass.
 *
 * Flow: adapter -> discovery.pool_created (raw) -> filter -> discovery.passed
 * Downstream modules (screening) subscribe to `discovery.passed` only.
 */
export class DiscoveryEngine {
  private readonly processedMints = new Set<string>();

  constructor(
    private readonly adapter: MarketDataAdapter,
    private readonly bus: EventBus,
    private readonly config: StrategyConfig,
  ) {}

  async start(): Promise<void> {
    this.bus.subscribe<DiscoveryEventPayload>('discovery.pool_created', (event) => {
      this.handlePoolCreated(event.payload);
    });
    this.bus.subscribe<DiscoveryEventPayload>('discovery.pool_updated', (event) => {
      this.handlePoolCreated(event.payload);
    });
    await this.adapter.start((event) => this.bus.publish(event));
    logger.info({ adapter: this.adapter.name }, 'Discovery engine started');
  }

  async stop(): Promise<void> {
    await this.adapter.stop();
  }

  /** For tests / observability. */
  processedCount(): number {
    return this.processedMints.size;
  }

  private handlePoolCreated(payload: DiscoveryEventPayload): void {
    if (payload.kind !== 'pool_created' && payload.kind !== 'pool_updated') return;
    const pool: PoolInfo = payload.pool;
    if (this.processedMints.has(pool.mint)) return;
    const result = applyDiscoveryFilters(pool, this.config);
    if (!result.passed) {
      logger.debug({ mint: pool.mint, reasons: result.reasons }, 'Token rejected by discovery filters');
      return;
    }
    this.processedMints.add(pool.mint);
    this.bus.publish({
      id: `discovery:passed:${pool.mint}`,
      type: 'discovery.passed',
      mint: pool.mint,
      timestamp: new Date(),
      payload,
    });
    logger.info({ mint: pool.mint, dex: pool.dex }, 'Token passed discovery filters');
  }
}
