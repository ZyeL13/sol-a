import type { RiskConfig } from '../config/risk.config';
import type { PortfolioState, RiskDecision, RiskEngine } from './types';

/** Phase 2 stub: enforces only the kill switch + open-position cap. */
export class StubRiskEngine implements RiskEngine {
  private killSwitch = false;

  approveBuy(state: PortfolioState, _mint: string, _sizeSol: number, config: RiskConfig): RiskDecision {
    if (this.killSwitch || state.killSwitchEngaged) {
      return { approved: false, reasons: ['kill switch engaged'] };
    }
    if (state.openPositions.length >= config.MAX_OPEN_POSITIONS) {
      return { approved: false, reasons: [`max open positions reached (${config.MAX_OPEN_POSITIONS})`] };
    }
    return { approved: true, reasons: [] };
  }

  engageKillSwitch(_reason: string): void {
    this.killSwitch = true;
  }

  clearKillSwitch(): void {
    this.killSwitch = false;
  }

  isKillSwitchEngaged(): boolean {
    return this.killSwitch;
  }
}
