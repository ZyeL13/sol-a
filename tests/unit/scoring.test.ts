import { describe, expect, it } from 'vitest';
import { scoreSecurity } from '../../src/security/scoring';
import type { SecurityData } from '../../src/security/types';
import { loadStrategyConfig } from '../../src/config/strategy.config';

const config = loadStrategyConfig();

function data(overrides: Partial<SecurityData> = {}): SecurityData {
  return {
    mint: 'So11111111111111111111111111111111111111112',
    mintAuthorityDisabled: true,
    freezeAuthorityDisabled: true,
    top10HolderPct: 15,
    topHolders: [],
    devWalletPct: 5,
    lpLocked: true,
    suspiciousAuthorities: [],
    rugCheck: { score: 100 },
    birdeye: null,
    dataGaps: ['birdeye'],
    ...overrides,
  };
}

describe('scoreSecurity', () => {
  it('scores a clean token high and passes it', () => {
    const r = scoreSecurity(data(), config);
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.risk).toBe('low');
    expect(r.passed).toBe(true);
  });

  it('hard-rejects mint authority enabled', () => {
    const r = scoreSecurity(data({ mintAuthorityDisabled: false }), config);
    expect(r.passed).toBe(false);
    expect(r.reasons.join(' ')).toContain('mint authority enabled');
  });

  it('hard-rejects freeze authority enabled', () => {
    const r = scoreSecurity(data({ freezeAuthorityDisabled: false }), config);
    expect(r.passed).toBe(false);
  });

  it('hard-rejects top-10 concentration over the limit', () => {
    const r = scoreSecurity(data({ top10HolderPct: 80 }), config);
    expect(r.passed).toBe(false);
    expect(r.score).toBeLessThan(70);
  });

  it('hard-rejects dev wallet over 50%', () => {
    const r = scoreSecurity(data({ devWalletPct: 60 }), config);
    expect(r.passed).toBe(false);
  });

  it('penalizes unknown authorities instead of treating them as safe', () => {
    const r = scoreSecurity(data({ mintAuthorityDisabled: null, freezeAuthorityDisabled: null }), config);
    expect(r.score).toBeLessThan(60);
    expect(r.passed).toBe(false);
  });

  it('never treats a third-party score as a pass on its own', () => {
    // RugCheck says 100 but on-chain facts are bad -> still rejected.
    const r = scoreSecurity(data({ mintAuthorityDisabled: false, rugCheck: { score: 100 } }), config);
    expect(r.passed).toBe(false);
  });

  it('classifies risk bands', () => {
    expect(scoreSecurity(data(), config).risk).toBe('low');
    expect(scoreSecurity(data({ lpLocked: false, top10HolderPct: 28 }), config).risk).toBe('medium');
    expect(scoreSecurity(data({ mintAuthorityDisabled: null, top10HolderPct: null }), config).risk).toBe('high');
  });
});
