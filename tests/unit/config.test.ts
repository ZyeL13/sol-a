import { afterEach, describe, expect, it } from 'vitest';
import { loadEnv } from '../../src/config/config';
import { loadRiskConfig, RiskConfigSchema } from '../../src/config/risk.config';
import { loadStrategyConfig } from '../../src/config/strategy.config';

describe('config validation', () => {
  afterEach(() => {
    delete process.env.POSITION_SIZE_SOL;
    delete process.env.MAX_OPEN_POSITIONS;
  });

  it('loads defaults', () => {
    const env = loadEnv({});
    expect(env.TRADING_MODE).toBe('paper');
    expect(env.SOLANA_RPC_URL).toContain('solana.com');
  });

  it('rejects live trading mode in Phase 1', () => {
    expect(() => loadEnv({ TRADING_MODE: 'live' })).toThrow(/live is not supported/);
  });

  it('rejects an invalid RPC url', () => {
    expect(() => loadEnv({ SOLANA_RPC_URL: 'not-a-url' })).toThrow();
  });

  it('loads risk defaults and env overrides', () => {
    expect(loadRiskConfig().POSITION_SIZE_SOL).toBe(0.5);
    process.env.POSITION_SIZE_SOL = '0.25';
    process.env.MAX_OPEN_POSITIONS = '5';
    const cfg = loadRiskConfig();
    expect(cfg.POSITION_SIZE_SOL).toBe(0.25);
    expect(cfg.MAX_OPEN_POSITIONS).toBe(5);
    expect(cfg.MAX_SLIPPAGE_BPS).toBeLessThanOrEqual(10000);
  });

  it('rejects out-of-range risk values', () => {
    expect(RiskConfigSchema.safeParse({ MAX_PORTFOLIO_EXPOSURE_PCT: 150 }).success).toBe(false);
    expect(RiskConfigSchema.safeParse({ POSITION_SIZE_SOL: -1 }).success).toBe(false);
  });

  it('loads strategy defaults', () => {
    const cfg = loadStrategyConfig();
    expect(cfg.MIN_LIQUIDITY_USD).toBe(10000);
    expect(cfg.REQUIRE_MINT_DISABLED).toBe(true);
    expect(cfg.MAX_TOP10_HOLDER_PCT).toBe(30);
  });
});
