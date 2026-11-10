import { z } from 'zod';

/**
 * Risk configuration — the risk engine has absolute authority to reject
 * trades. All amounts are in SOL unless stated otherwise.
 */
export const RiskConfigSchema = z.object({
  /** Maximum SOL deployed into a single position. */
  POSITION_SIZE_SOL: z.number().positive().default(0.5),
  /** Maximum number of simultaneously open positions. */
  MAX_OPEN_POSITIONS: z.number().int().positive().default(3),
  /** Maximum share of the portfolio that may be deployed at once (0-100). */
  MAX_PORTFOLIO_EXPOSURE_PCT: z.number().min(0).max(100).default(30),
  /** Maximum SOL that may be lost in one day before trading halts. */
  DAILY_MAX_LOSS_SOL: z.number().positive().default(1),
  /** Maximum drawdown from the daily peak (0-100%). */
  MAX_DRAWDOWN_PCT: z.number().min(0).max(100).default(10),
  /** Halt new entries after this many consecutive losing trades. */
  MAX_CONSECUTIVE_LOSSES: z.number().int().nonnegative().default(3),
  /** Maximum share of the portfolio in any single token (0-100%). */
  MAX_PER_TOKEN_EXPOSURE_PCT: z.number().min(0).max(100).default(10),
  /** Take-profit level (percent gain). */
  TAKE_PROFIT_PCT: z.number().positive().default(50),
  /** Stop-loss level (percent loss). */
  STOP_LOSS_PCT: z.number().positive().default(20),
  /** Trailing stop distance (percent below the peak). */
  TRAILING_STOP_PCT: z.number().positive().default(15),
  /** Maximum slippage in basis points. */
  MAX_SLIPPAGE_BPS: z.number().int().min(0).max(10000).default(500),
  /** Priority fee per transaction, in lamports. */
  PRIORITY_FEE_LAMPORTS: z.number().int().nonnegative().default(10000),
  /** Jito tip per bundle, in SOL. */
  JITO_TIP_SOL: z.number().nonnegative().default(0.001),
});

export type RiskConfig = z.infer<typeof RiskConfigSchema>;

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const v = Number(raw);
  if (!Number.isFinite(v)) throw new Error(`Invalid ${name}: ${raw}`);
  return v;
}

/** Load risk config from env with the schema defaults as fallback. */
export function loadRiskConfig(source: NodeJS.ProcessEnv = process.env): RiskConfig {
  const parsed = RiskConfigSchema.safeParse({
    POSITION_SIZE_SOL: num('POSITION_SIZE_SOL', 0.5),
    MAX_OPEN_POSITIONS: num('MAX_OPEN_POSITIONS', 3),
    MAX_PORTFOLIO_EXPOSURE_PCT: num('MAX_PORTFOLIO_EXPOSURE_PCT', 30),
    DAILY_MAX_LOSS_SOL: num('DAILY_MAX_LOSS_SOL', 1),
    MAX_DRAWDOWN_PCT: num('MAX_DRAWDOWN_PCT', 10),
    MAX_CONSECUTIVE_LOSSES: num('MAX_CONSECUTIVE_LOSSES', 3),
    MAX_PER_TOKEN_EXPOSURE_PCT: num('MAX_PER_TOKEN_EXPOSURE_PCT', 10),
    TAKE_PROFIT_PCT: num('TAKE_PROFIT_PCT', 50),
    STOP_LOSS_PCT: num('STOP_LOSS_PCT', 20),
    TRAILING_STOP_PCT: num('TRAILING_STOP_PCT', 15),
    MAX_SLIPPAGE_BPS: num('MAX_SLIPPAGE_BPS', 500),
    PRIORITY_FEE_LAMPORTS: num('PRIORITY_FEE_LAMPORTS', 10000),
    JITO_TIP_SOL: num('JITO_TIP_SOL', 0.001),
    _source: source,
  });
  if (!parsed.success) {
    throw new Error(`Invalid risk config: ${parsed.error.message}`);
  }
  return parsed.data;
}

export const riskConfig: RiskConfig = loadRiskConfig();
