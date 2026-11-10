import { describe, expect, it } from 'vitest';
import { applyDiscoveryFilters } from '../../src/market/filters';
import type { PoolInfo } from '../../src/market/types';
import { loadStrategyConfig } from '../../src/config/strategy.config';

const config = loadStrategyConfig();

function pool(overrides: Partial<PoolInfo> = {}): PoolInfo {
  return {
    mint: 'So11111111111111111111111111111111111111112',
    poolAddress: 'pool1',
    dex: 'pumpfun',
    liquidityUsd: 50_000,
    volumeUsd24h: 20_000,
    buyTransactions: 50,
    uniqueBuyers: 100,
    poolCreatedAt: Date.now() - 60_000,
    ...overrides,
  };
}

describe('applyDiscoveryFilters', () => {
  it('passes a healthy pool', () => {
    expect(applyDiscoveryFilters(pool(), config).passed).toBe(true);
  });

  it('rejects low liquidity', () => {
    const r = applyDiscoveryFilters(pool({ liquidityUsd: 100 }), config);
    expect(r.passed).toBe(false);
    expect(r.reasons.join(' ')).toContain('liquidity');
  });

  it('rejects low volume', () => {
    expect(applyDiscoveryFilters(pool({ volumeUsd24h: 10 }), config).passed).toBe(false);
  });

  it('rejects an old pool', () => {
    const r = applyDiscoveryFilters(pool({ poolCreatedAt: Date.now() - 7200_000 }), config);
    expect(r.passed).toBe(false);
    expect(r.reasons.join(' ')).toContain('pool age');
  });

  it('rejects too few buys / buyers', () => {
    expect(applyDiscoveryFilters(pool({ buyTransactions: 0 }), config).passed).toBe(false);
    expect(applyDiscoveryFilters(pool({ uniqueBuyers: 1 }), config).passed).toBe(false);
  });

  it('collects all failing reasons at once', () => {
    const r = applyDiscoveryFilters(pool({ liquidityUsd: 0, volumeUsd24h: 0, buyTransactions: 0 }), config);
    expect(r.reasons.length).toBeGreaterThanOrEqual(3);
  });
});
