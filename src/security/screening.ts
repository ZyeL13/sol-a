import { Connection } from '@solana/web3.js';
import { EventBus } from '../common/eventBus';
import { logger } from '../common/logger';
import type { StrategyConfig } from '../config/strategy.config';
import type { DiscoveryEventPayload } from '../market/types';
import { OnChainCollector } from './onChain';
import { scoreSecurity } from './scoring';
import type { ScreeningResult, SecurityData, SecurityProvider } from './types';

/**
 * Screening service: subscribes to `discovery.passed`, collects on-chain
 * facts + provider data, scores, and republishes `screening.completed`.
 * Tokens that pass are republished as `screening.passed` for Phase 2.
 */
export class ScreeningService {
  private readonly collector: OnChainCollector;

  constructor(
    private readonly bus: EventBus,
    private readonly config: StrategyConfig,
    private readonly providers: SecurityProvider[],
    connection: Connection,
  ) {
    this.collector = new OnChainCollector(connection);
  }

  start(): void {
    this.bus.subscribe<DiscoveryEventPayload>('discovery.passed', async (event) => {
      const mint = event.mint;
      try {
        const result = await this.screen(mint);
        this.bus.publish({
          id: `screening:${mint}:${Date.now()}`,
          type: 'screening.completed',
          mint,
          timestamp: new Date(),
          payload: result,
        });
        if (result.passed) {
          this.bus.publish({
            id: `screening:passed:${mint}`,
            type: 'screening.passed',
            mint,
            timestamp: new Date(),
            payload: result,
          });
        }
        logger.info({ mint, score: result.score, risk: result.risk, passed: result.passed }, 'Screening completed');
      } catch (err) {
        logger.error({ err, mint }, 'Screening failed');
      }
    });
  }

  async screen(mint: string): Promise<ScreeningResult> {
    const onChain = await this.collector.collect(mint);
    const dataGaps: string[] = [];
    let rugCheck: unknown | null = null;
    let birdeye: unknown | null = null;
    for (const provider of this.providers) {
      const data = await provider.fetch(mint);
      if (data === null) dataGaps.push(provider.name);
      if (provider.name === 'rugcheck') rugCheck = data;
      if (provider.name === 'birdeye') birdeye = data;
    }
    const data: SecurityData = { ...onChain, rugCheck, birdeye, dataGaps };
    return scoreSecurity(data, this.config);
  }
}
