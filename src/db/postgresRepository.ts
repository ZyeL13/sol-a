import { Pool } from 'pg';
import { logger } from '../common/logger';
import type { PoolInfo, TokenInfo } from '../market/types';
import type { ScreeningResult } from '../security/types';
import type { ScreeningRecord, TokenRecord, TokenRepository } from './repository';

/** Postgres implementation of TokenRepository (production). */
export class PostgresTokenRepository implements TokenRepository {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 10 });
    this.pool.on('error', (err) => logger.error({ err }, 'Postgres pool error'));
  }

  async ping(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async upsertToken(token: TokenInfo): Promise<TokenRecord> {
    const { rows } = await this.pool.query(
      `INSERT INTO tokens (mint, name, symbol, decimals, source, deployer)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (mint) DO UPDATE SET name = EXCLUDED.name, symbol = EXCLUDED.symbol
       RETURNING mint, name, symbol, decimals, source, deployer, first_seen_at AS "firstSeenAt"`,
      [token.mint, token.name ?? null, token.symbol ?? null, token.decimals, token.source, token.deployer ?? null],
    );
    return rows[0] as TokenRecord;
  }

  async upsertPool(pool: PoolInfo): Promise<void> {
    await this.pool.query(
      `INSERT INTO pools (pool_address, mint, dex, liquidity_usd, volume_usd_24h, buy_transactions, unique_buyers, pool_created_at, price_sol, market_cap_usd, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,to_timestamp($8/1000.0),$9,$10,now())
       ON CONFLICT (pool_address) DO UPDATE SET
         liquidity_usd = EXCLUDED.liquidity_usd, volume_usd_24h = EXCLUDED.volume_usd_24h,
         buy_transactions = EXCLUDED.buy_transactions, unique_buyers = EXCLUDED.unique_buyers,
         price_sol = EXCLUDED.price_sol, market_cap_usd = EXCLUDED.market_cap_usd, updated_at = now()`,
      [
        pool.poolAddress,
        pool.mint,
        pool.dex,
        pool.liquidityUsd,
        pool.volumeUsd24h,
        pool.buyTransactions,
        pool.uniqueBuyers,
        pool.poolCreatedAt,
        pool.priceSol ?? null,
        pool.marketCapUsd ?? null,
      ],
    );
  }

  async saveScreening(result: ScreeningResult): Promise<ScreeningRecord> {
    const { rows } = await this.pool.query(
      `INSERT INTO screenings (mint, score, risk, passed, reasons, data, screened_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [
        result.mint,
        result.score,
        result.risk,
        result.passed,
        JSON.stringify(result.reasons),
        JSON.stringify(result.data),
        result.screenedAt,
      ],
    );
    return { ...result, id: rows[0].id as number };
  }

  async saveEvent(id: string, type: string, mint: string | null, payload: unknown): Promise<void> {
    await this.pool.query(
      `INSERT INTO events (id, type, mint, payload) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
      [id, type, mint, JSON.stringify(payload ?? {})],
    );
  }

  async logDecision(mint: string | null, decision: string, reason: string, details: unknown): Promise<void> {
    await this.pool.query(
      `INSERT INTO decision_log (mint, decision, reason, details) VALUES ($1,$2,$3,$4)`,
      [mint, decision, reason, JSON.stringify(details ?? {})],
    );
  }

  async getToken(mint: string): Promise<TokenRecord | null> {
    const { rows } = await this.pool.query(
      `SELECT mint, name, symbol, decimals, source, deployer, first_seen_at AS "firstSeenAt" FROM tokens WHERE mint = $1`,
      [mint],
    );
    return (rows[0] as TokenRecord | undefined) ?? null;
  }

  async listTokens(limit = 100): Promise<TokenRecord[]> {
    const { rows } = await this.pool.query(
      `SELECT mint, name, symbol, decimals, source, deployer, first_seen_at AS "firstSeenAt" FROM tokens ORDER BY first_seen_at DESC LIMIT $1`,
      [limit],
    );
    return rows as TokenRecord[];
  }
}
