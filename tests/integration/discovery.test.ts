import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../src/common/eventBus';
import { loadStrategyConfig } from '../../src/config/strategy.config';
import { DiscoveryEngine } from '../../src/market/discovery';
import { MockAdapter } from '../../src/market/mockAdapter';
import type { DiscoveryEventPayload } from '../../src/market/types';

describe('DiscoveryEngine + MockAdapter (integration)', () => {
  it('publishes discovery.passed only for pools that pass the filters', async () => {
    const bus = new EventBus();
    const config = loadStrategyConfig();
    const now = Date.now();
    const goodMint = 'Good111111111111111111111111111111111111111';
    const badMint = 'Bad11111111111111111111111111111111111111111';
    const adapter = new MockAdapter([
      {
        token: { mint: goodMint, decimals: 6, createdAt: now, source: 'pumpfun' },
        pool: {
          mint: goodMint, poolAddress: 'p1', dex: 'pumpfun',
          liquidityUsd: 50_000, volumeUsd24h: 20_000, buyTransactions: 50,
          uniqueBuyers: 100, poolCreatedAt: now - 60_000,
        },
      },
      {
        token: { mint: badMint, decimals: 6, createdAt: now, source: 'pumpfun' },
        pool: {
          mint: badMint, poolAddress: 'p2', dex: 'pumpfun',
          liquidityUsd: 10, volumeUsd24h: 0, buyTransactions: 0,
          uniqueBuyers: 0, poolCreatedAt: now - 60_000,
        },
      },
    ]);
    const engine = new DiscoveryEngine(adapter, bus, config);
    const passed: string[] = [];
    bus.subscribe<DiscoveryEventPayload>('discovery.passed', (event) => {
      passed.push(event.mint);
    });
    await engine.start();
    // Give the async bus handlers a tick to run.
    await new Promise((r) => setTimeout(r, 50));
    await engine.stop();
    expect(passed).toEqual([goodMint]);
    expect(engine.processedCount()).toBe(1);
  });

  it('does not reprocess the same mint twice', async () => {
    const bus = new EventBus();
    const config = loadStrategyConfig();
    const now = Date.now();
    const mint = 'Dup11111111111111111111111111111111111111111';
    const fixture = {
      token: { mint, decimals: 6, createdAt: now, source: 'raydium' as const },
      pool: {
        mint, poolAddress: 'p1', dex: 'raydium' as const,
        liquidityUsd: 50_000, volumeUsd24h: 20_000, buyTransactions: 50,
        uniqueBuyers: 100, poolCreatedAt: now - 60_000,
      },
    };
    const adapter = new MockAdapter([fixture, fixture]);
    const engine = new DiscoveryEngine(adapter, bus, config);
    const passed: string[] = [];
    bus.subscribe<DiscoveryEventPayload>('discovery.passed', (e) => passed.push(e.mint));
    await engine.start();
    await new Promise((r) => setTimeout(r, 50));
    await engine.stop();
    expect(passed).toHaveLength(1);
  });
});

describe('Security providers degrade gracefully (integration, mocked fetch)', () => {
  it('RugCheck returns null when the API is down instead of throwing', async () => {
    const { RugCheckProvider } = await import('../../src/security/rugcheck');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const provider = new RugCheckProvider('https://api.rugcheck.xyz/v1');
    await expect(provider.fetch('SomeMint11111111111111111111111111111111')).resolves.toBeNull();
    vi.unstubAllGlobals();
  });

  it('Birdeye returns null without an API key', async () => {
    const { BirdeyeProvider } = await import('../../src/security/birdeye');
    const provider = new BirdeyeProvider('https://public-api.birdeye.so', '');
    await expect(provider.fetch('SomeMint11111111111111111111111111111111')).resolves.toBeNull();
  });
});
