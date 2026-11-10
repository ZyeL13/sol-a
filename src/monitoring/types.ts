/**
 * Phase 4 stub — position monitoring (stop-loss, take-profit, trailing stop,
 * max holding duration, liquidity deterioration, emergency exit).
 * The monitor runs independently of discovery: positions keep being watched
 * even when no new tokens appear.
 */
export interface MonitoredPosition {
  mint: string;
  entryPriceSol: number;
  sizeSol: number;
  peakPriceSol: number;
  openedAt: number;
}

export type ExitReason =
  | 'stop_loss'
  | 'take_profit'
  | 'trailing_stop'
  | 'max_holding_duration'
  | 'liquidity_deterioration'
  | 'emergency';

export interface ExitDecision {
  exit: boolean;
  reason?: ExitReason;
  partialPct?: number;
}

export interface PositionMonitor {
  /** Evaluate one position against the current price. Pure decision, no execution. */
  evaluate(position: MonitoredPosition, currentPriceSol: number, now?: number): ExitDecision;
}
