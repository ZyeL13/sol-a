import { z } from 'zod';

/**
 * Strategy / discovery filter configuration.
 */
export const StrategyConfigSchema = z.object({
  /** Minimum pool liquidity in USD to consider a token. */
  MIN_LIQUIDITY_USD: z.number().nonnegative().default(10000),
  /** Minimum 24h volume in USD to consider a token. */
  MIN_VOLUME_USD: z.number().nonnegative().default(5000),
  /** Maximum pool age in seconds at discovery time. */
  MAX_POOL_AGE_SECONDS: z.number().int().positive().default(3600),
  /** Minimum number of buy transactions in the observation window. */
  MIN_BUY_TRANSACTIONS: z.number().int().nonnegative().default(10),
  /** Minimum number of unique buyers in the observation window. */
  MIN_UNIQUE_BUYERS: z.number().int().nonnegative().default(20),
  /** Maximum share of supply held by the top 10 holders (0-100%). */
  MAX_TOP10_HOLDER_PCT: z.number().min(0).max(100).default(30),
  /** Reject tokens whose mint authority is still enabled. */
  REQUIRE_MINT_DISABLED: z.boolean().default(true),
  /** Reject tokens whose freeze authority is still enabled. */
  REQUIRE_FREEZE_DISABLED: z.boolean().default(true),
  /** Minimum security score (0-100) required to pass screening. */
  MIN_SECURITY_SCORE: z.number().min(0).max(100).default(60),
  /** Minimum strategy confidence (0-1) required to emit a BUY signal. */
  MIN_SIGNAL_CONFIDENCE: z.number().min(0).max(1).default(0.6),
  /** How long a signal stays valid, in seconds. */
  SIGNAL_TTL_SECONDS: z.number().int().positive().default(300),
  /** Maximum holding duration for a position, in seconds. */
  MAX_HOLDING_SECONDS: z.number().int().positive().default(3600),
});

export type StrategyConfig = z.infer<typeof StrategyConfigSchema>;

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const v = Number(raw);
  if (!Number.isFinite(v)) throw new Error(`Invalid ${name}: ${raw}`);
  return v;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error(`Invalid ${name}: ${raw} (expected true/false)`);
}

export function loadStrategyConfig(): StrategyConfig {
  const parsed = StrategyConfigSchema.safeParse({
    MIN_LIQUIDITY_USD: num('MIN_LIQUIDITY_USD', 10000),
    MIN_VOLUME_USD: num('MIN_VOLUME_USD', 5000),
    MAX_POOL_AGE_SECONDS: num('MAX_POOL_AGE_SECONDS', 3600),
    MIN_BUY_TRANSACTIONS: num('MIN_BUY_TRANSACTIONS', 10),
    MIN_UNIQUE_BUYERS: num('MIN_UNIQUE_BUYERS', 20),
    MAX_TOP10_HOLDER_PCT: num('MAX_TOP10_HOLDER_PCT', 30),
    REQUIRE_MINT_DISABLED: bool('REQUIRE_MINT_DISABLED', true),
    REQUIRE_FREEZE_DISABLED: bool('REQUIRE_FREEZE_DISABLED', true),
    MIN_SECURITY_SCORE: num('MIN_SECURITY_SCORE', 60),
    MIN_SIGNAL_CONFIDENCE: num('MIN_SIGNAL_CONFIDENCE', 0.6),
    SIGNAL_TTL_SECONDS: num('SIGNAL_TTL_SECONDS', 300),
    MAX_HOLDING_SECONDS: num('MAX_HOLDING_SECONDS', 3600),
  });
  if (!parsed.success) throw new Error(`Invalid strategy config: ${parsed.error.message}`);
  return parsed.data;
}

export const strategyConfig: StrategyConfig = loadStrategyConfig();
