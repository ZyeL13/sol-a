import type { PoolInfo, TokenInfo } from '../market/types';
import type { ScreeningResult } from '../security/types';

export interface TokenRecord extends TokenInfo {
  firstSeenAt: Date;
}

export interface ScreeningRecord extends ScreeningResult {
  id?: number;
}

/** Persistence interface. Postgres is the production implementation; the
 * in-memory implementation is used for unit tests and for running without a DB. */
export interface TokenRepository {
  upsertToken(token: TokenInfo): Promise<TokenRecord>;
  upsertPool(pool: PoolInfo): Promise<void>;
  saveScreening(result: ScreeningResult): Promise<ScreeningRecord>;
  saveEvent(id: string, type: string, mint: string | null, payload: unknown): Promise<void>;
  logDecision(mint: string | null, decision: string, reason: string, details: unknown): Promise<void>;
  getToken(mint: string): Promise<TokenRecord | null>;
  listTokens(limit?: number): Promise<TokenRecord[]>;
  /** Returns true when the underlying store is reachable. */
  ping(): Promise<boolean>;
}
