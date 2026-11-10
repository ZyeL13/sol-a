import type { PoolInfo } from './types';
import type { FilterResult } from './types';
import type { StrategyConfig } from '../config/strategy.config';

/**
 * Initial discovery filters (Phase 1). Pure functions — easy to unit test,
 * no I/O. All thresholds come from strategy.config.ts.
 */
export function applyDiscoveryFilters(pool: PoolInfo, config: StrategyConfig, now = Date.now()): FilterResult {
  const reasons: string[] = [];
  if (pool.liquidityUsd < config.MIN_LIQUIDITY_USD) {
    reasons.push(`liquidity ${pool.liquidityUsd} < MIN_LIQUIDITY_USD ${config.MIN_LIQUIDITY_USD}`);
  }
  if (pool.volumeUsd24h < config.MIN_VOLUME_USD) {
    reasons.push(`volume24h ${pool.volumeUsd24h} < MIN_VOLUME_USD ${config.MIN_VOLUME_USD}`);
  }
  const ageSeconds = Math.max(0, (now - pool.poolCreatedAt) / 1000);
  if (ageSeconds > config.MAX_POOL_AGE_SECONDS) {
    reasons.push(`pool age ${Math.round(ageSeconds)}s > MAX_POOL_AGE_SECONDS ${config.MAX_POOL_AGE_SECONDS}`);
  }
  if (pool.buyTransactions < config.MIN_BUY_TRANSACTIONS) {
    reasons.push(`buyTransactions ${pool.buyTransactions} < MIN_BUY_TRANSACTIONS ${config.MIN_BUY_TRANSACTIONS}`);
  }
  if (pool.uniqueBuyers < config.MIN_UNIQUE_BUYERS) {
    reasons.push(`uniqueBuyers ${pool.uniqueBuyers} < MIN_UNIQUE_BUYERS ${config.MIN_UNIQUE_BUYERS}`);
  }
  return { passed: reasons.length === 0, reasons };
}
