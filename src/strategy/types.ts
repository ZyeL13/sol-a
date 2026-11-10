/**
 * Phase 2 stub — strategy engine interface.
 * Implementations (momentum, volume acceleration, liquidity growth,
 * buy/sell pressure) land in Phase 2. This file defines the contract so
 * Phase 1 modules can depend on it without a concrete strategy.
 *
 * IMPORTANT: LLMs must never be used in the critical trading decision or
 * transaction execution path.
 */

export type SignalType = 'BUY' | 'SELL' | 'SKIP';

export interface StrategySignal {
  mint: string;
  type: SignalType;
  /** 0-1. */
  confidence: number;
  entryPriceSol?: number;
  suggestedPositionSol?: number;
  /** Expected reward / risk ratio. */
  riskReward?: number;
  stopLossSol?: number;
  takeProfitSol?: number[];
  /** Unix ms after which the signal is stale. */
  expiresAt: number;
  reason: string;
}

export interface StrategyInput {
  mint: string;
  priceSol: number;
  liquidityUsd: number;
  volumeUsd24h: number;
  buyTransactions: number;
  uniqueBuyers: number;
  marketCapUsd?: number;
  /** Price history, oldest first (SOL). */
  priceHistorySol: number[];
}

export interface StrategyEngine {
  readonly name: string;
  evaluate(input: StrategyInput): StrategySignal;
}
