import type { PoolInfo, TokenInfo } from '../market/types';
import type { ScreeningResult } from '../security/types';
import type { ScreeningRecord, TokenRecord, TokenRepository } from './repository';

/** In-memory repository: tests + running without Postgres. Not durable. */
export class InMemoryTokenRepository implements TokenRepository {
  private readonly tokens = new Map<string, TokenRecord>();
  private readonly pools = new Map<string, PoolInfo>();
  private readonly screenings: ScreeningRecord[] = [];
  private readonly events: Array<{ id: string; type: string; mint: string | null; payload: unknown }> = [];
  private readonly decisions: Array<{ mint: string | null; decision: string; reason: string; details: unknown }> = [];

  async upsertToken(token: TokenInfo): Promise<TokenRecord> {
    const existing = this.tokens.get(token.mint);
    const record: TokenRecord = { ...token, firstSeenAt: existing?.firstSeenAt ?? new Date() };
    this.tokens.set(token.mint, record);
    return record;
  }

  async upsertPool(pool: PoolInfo): Promise<void> {
    this.pools.set(pool.poolAddress, pool);
  }

  async saveScreening(result: ScreeningResult): Promise<ScreeningRecord> {
    const record: ScreeningRecord = { ...result, id: this.screenings.length + 1 };
    this.screenings.push(record);
    return record;
  }

  async saveEvent(id: string, type: string, mint: string | null, payload: unknown): Promise<void> {
    if (!this.events.some((e) => e.id === id)) {
      this.events.push({ id, type, mint, payload });
    }
  }

  async logDecision(mint: string | null, decision: string, reason: string, details: unknown): Promise<void> {
    this.decisions.push({ mint, decision, reason, details });
  }

  async getToken(mint: string): Promise<TokenRecord | null> {
    return this.tokens.get(mint) ?? null;
  }

  async listTokens(limit = 100): Promise<TokenRecord[]> {
    return [...this.tokens.values()].slice(0, limit);
  }

  async ping(): Promise<boolean> {
    return true;
  }

  // Test helpers
  screeningCount(): number {
    return this.screenings.length;
  }
  eventCount(): number {
    return this.events.length;
  }
}
