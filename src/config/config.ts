import { z } from 'zod';

/**
 * Central configuration. Every value is validated at startup and fails fast
 * on bad input. No private keys or credentials are ever hardcoded; they come
 * from the environment only.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  SOLANA_RPC_URL: z.string().url().default('https://api.mainnet-beta.solana.com'),
  SOLANA_WS_URL: z.string().default('wss://api.mainnet-beta.solana.com'),
  YELLOWSTONE_GRPC_URL: z.string().optional().default(''),
  YELLOWSTONE_GRPC_TOKEN: z.string().optional().default(''),
  PUMPFUN_PROGRAM_ID: z.string().default('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'),
  RAYDIUM_AMM_PROGRAM_ID: z.string().default('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'),

  RUGCHECK_API_URL: z.string().url().default('https://api.rugcheck.xyz/v1'),
  BIRDEYE_API_URL: z.string().url().default('https://public-api.birdeye.so'),
  BIRDEYE_API_KEY: z.string().optional().default(''),

  JUPITER_API_URL: z.string().url().default('https://quote-api.jup.ag/v6'),
  JITO_BLOCK_ENGINE_URL: z.string().optional().default(''),

  DATABASE_URL: z.string().default('postgres://sol_a:sol_a_dev@localhost:5432/sol_a'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  TRADING_MODE: z.enum(['paper', 'live']).default('paper'),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid configuration: ${details}`);
  }
  if (parsed.data.TRADING_MODE === 'live') {
    // Live trading is not implemented in Phase 1. Refuse loudly instead of
    // silently running a paper system against real funds.
    throw new Error('TRADING_MODE=live is not supported in Phase 1 (paper trading only).');
  }
  return parsed.data;
}

export const env: Env = loadEnv();
