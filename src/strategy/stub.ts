import type { StrategyEngine, StrategyInput, StrategySignal } from './types';
import { logger } from '../common/logger';

/** Phase 2 stub: always SKIP. Replace with momentum / volume strategies. */
export class StubStrategyEngine implements StrategyEngine {
  readonly name = 'stub-strategy';

  evaluate(input: StrategyInput): StrategySignal {
    logger.debug({ mint: input.mint }, 'Stub strategy evaluated (always SKIP)');
    return {
      mint: input.mint,
      type: 'SKIP',
      confidence: 0,
      expiresAt: Date.now() + 60_000,
      reason: 'Phase 2 strategy not implemented yet',
    };
  }
}
