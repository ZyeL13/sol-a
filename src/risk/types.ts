import type { RiskConfig } from '../config/risk.config';

/**
 * Phase 2 stub — risk management engine interface.
 * The risk engine has absolute authority to reject trades in the live
 * system. Phase 1 ships the contract + a permissive paper stub; the real
 * checks (position limits, exposure, daily loss, drawdown, consecutive
 * losses, kill switch) are Phase 2.
 */

export interface Position {
  mint: string;
  sizeSol: number;
  entryPriceSol: number;
  openedAt: number;
}

export interface PortfolioState {
  availableSol: number;
  openPositions: Position[];
  realizedPnlSol: number;
  unrealizedPnlSol: number;
  dailyLossSol: number;
  consecutiveLosses: number;
  killSwitchEngaged: boolean;
}

export interface RiskDecision {
  approved: boolean;
  reasons: string[];
}

export interface RiskEngine {
  /** Approve or reject a proposed BUY. Never approve when the kill switch is on. */
  approveBuy(state: PortfolioState, mint: string, sizeSol: number, config: RiskConfig): RiskDecision;
  /** Emergency halt: reject all new entries until manually cleared. */
  engageKillSwitch(reason: string): void;
  clearKillSwitch(): void;
  isKillSwitchEngaged(): boolean;
}
