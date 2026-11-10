/**
 * Phase 3 stub — execution engine interface (Jupiter + optional Jito).
 * Phase 1 must NOT execute trades. This contract exists so the architecture
 * is extensible; any implementation must simulate first, validate, retry
 * with bounded attempts, monitor confirmation, and prevent duplicates.
 */
export interface SwapRequest {
  mint: string;
  /** SOL to spend (buy) or token amount to sell. */
  amount: number;
  side: 'buy' | 'sell';
  maxSlippageBps: number;
  priorityFeeLamports: number;
  jitoTipSol: number;
}

export interface SwapResult {
  signature: string;
  executedPriceSol: number;
  feesSol: number;
  confirmed: boolean;
}

export interface ExecutionEngine {
  /** Simulate only — never broadcasts. */
  simulate(request: SwapRequest): Promise<{ ok: boolean; reason?: string }>;
  /** Full execution path (Phase 3). */
  execute(request: SwapRequest): Promise<SwapResult>;
}
