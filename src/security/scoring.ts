import type { StrategyConfig } from '../config/strategy.config';
import type { RiskClass, ScreeningResult, SecurityData } from './types';

/**
 * Deterministic scoring. Third-party provider data is NOT used to compute
 * the score in Phase 1 — it is recorded for audit and for future rules.
 * The score comes only from verifiable on-chain facts plus explicit
 * data-gap penalties, so a token can never pass because a provider said so.
 */
export function scoreSecurity(data: SecurityData, config: StrategyConfig): ScreeningResult {
  let score = 100;
  const reasons: string[] = [];
  const hardReject: string[] = [];

  if (data.mintAuthorityDisabled === false) {
    score -= 40;
    reasons.push('mint authority is still enabled');
    if (config.REQUIRE_MINT_DISABLED) hardReject.push('mint authority enabled');
  } else if (data.mintAuthorityDisabled === null) {
    score -= 30;
    reasons.push('mint authority status unknown (data gap)');
  }

  if (data.freezeAuthorityDisabled === false) {
    score -= 25;
    reasons.push('freeze authority is still enabled');
    if (config.REQUIRE_FREEZE_DISABLED) hardReject.push('freeze authority enabled');
  } else if (data.freezeAuthorityDisabled === null) {
    score -= 20;
    reasons.push('freeze authority status unknown (data gap)');
  }

  if (data.top10HolderPct !== null) {
    if (data.top10HolderPct > config.MAX_TOP10_HOLDER_PCT) {
      score -= 30;
      reasons.push(
        `top-10 holders own ${data.top10HolderPct.toFixed(1)}% > MAX_TOP10_HOLDER_PCT ${config.MAX_TOP10_HOLDER_PCT}%`,
      );
      hardReject.push('top-10 holder concentration too high');
    } else if (data.top10HolderPct > config.MAX_TOP10_HOLDER_PCT * 0.8) {
      score -= 10;
      reasons.push(`top-10 holders own ${data.top10HolderPct.toFixed(1)}% (near limit)`);
    }
  } else {
    score -= 15;
    reasons.push('top-10 holder concentration unknown (data gap)');
  }

  if (data.devWalletPct !== null) {
    if (data.devWalletPct > 50) {
      score -= 25;
      reasons.push(`dev wallet holds ${data.devWalletPct.toFixed(1)}% of supply`);
      hardReject.push('dev wallet concentration > 50%');
    } else if (data.devWalletPct > 20) {
      score -= 15;
      reasons.push(`dev wallet holds ${data.devWalletPct.toFixed(1)}% of supply`);
    }
  }

  if (data.lpLocked === false) {
    score -= 15;
    reasons.push('liquidity pool is not locked/burned');
  } else if (data.lpLocked === null) {
    score -= 5;
    reasons.push('LP lock status could not be verified (data gap)');
  }

  if (data.suspiciousAuthorities.length > 0) {
    score -= Math.min(20, data.suspiciousAuthorities.length * 10);
    reasons.push(`suspicious authorities: ${data.suspiciousAuthorities.join(', ')}`);
  }

  if (data.dataGaps.length > 0) {
    score -= Math.min(10, data.dataGaps.length * 5);
    reasons.push(`unavailable data: ${data.dataGaps.join(', ')}`);
  }

  score = Math.max(0, Math.min(100, score));
  const risk: RiskClass = score >= 80 ? 'low' : score >= 60 ? 'medium' : score >= 40 ? 'high' : 'critical';
  const passed = hardReject.length === 0 && score >= config.MIN_SECURITY_SCORE;
  return {
    mint: data.mint,
    score,
    risk,
    passed,
    reasons: [...hardReject.map((r) => `REJECT: ${r}`), ...reasons],
    data,
    screenedAt: new Date(),
  };
}
