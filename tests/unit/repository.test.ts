import { describe, expect, it } from 'vitest';
import { InMemoryTokenRepository } from '../../src/db/memoryRepository';

describe('InMemoryTokenRepository', () => {
  it('upserts tokens idempotently and lists them', async () => {
    const repo = new InMemoryTokenRepository();
    const token = { mint: 'M1', decimals: 6, createdAt: Date.now(), source: 'pumpfun' as const };
    await repo.upsertToken(token);
    await repo.upsertToken({ ...token, name: 'Test' });
    expect(await repo.getToken('M1')).toMatchObject({ mint: 'M1', name: 'Test' });
    expect((await repo.listTokens()).length).toBe(1);
    expect(await repo.ping()).toBe(true);
  });

  it('deduplicates events by id and counts screenings', async () => {
    const repo = new InMemoryTokenRepository();
    await repo.saveEvent('e1', 'discovery.passed', 'M1', {});
    await repo.saveEvent('e1', 'discovery.passed', 'M1', {});
    expect(repo.eventCount()).toBe(1);
    await repo.saveScreening({
      mint: 'M1',
      score: 90,
      risk: 'low',
      passed: true,
      reasons: [],
      data: {} as never,
      screenedAt: new Date(),
    });
    expect(repo.screeningCount()).toBe(1);
  });
});
