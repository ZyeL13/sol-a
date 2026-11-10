import { Connection, PublicKey } from '@solana/web3.js';
import { logger } from '../common/logger';
import { withRetry } from '../common/retry';
import type { MarketDataAdapter } from './adapter';
import { discoveryEventId } from './adapter';
import type { MarketEvent } from '../common/eventBus';
import type { DiscoveryEventPayload } from './types';

/**
 * Solana WebSocket adapter (Phase 1 default).
 *
 * Subscribes to program-account changes for the Pump.fun and Raydium AMM
 * programs and emits normalized `pool_created` events. It does NOT decode
 * every instruction — full instruction parsing is a Phase 2 refinement. The
 * adapter is deliberately conservative: it emits what it can verify (a new
 * account under a known program) and lets the screening engine do the rest.
 */
export class SolanaWsAdapter implements MarketDataAdapter {
  readonly name = 'solana-ws';
  private connection: Connection;
  private subscriptions: number[] = [];
  private stopped = false;

  constructor(
    private readonly rpcUrl: string,
    private readonly wsUrl: string,
    private readonly pumpfunProgramId: string,
    private readonly raydiumProgramId: string,
  ) {
    this.connection = new Connection(rpcUrl, { wsEndpoint: wsUrl, commitment: 'confirmed' });
  }

  async start(onEvent: (event: MarketEvent<DiscoveryEventPayload>) => void): Promise<void> {
    this.stopped = false;
    await withRetry(async () => {
      const slot = await this.connection.getSlot();
      logger.info({ slot, adapter: this.name }, 'Solana WS adapter connected');
    });
    for (const [programId, dex] of [
      [this.pumpfunProgramId, 'pumpfun'],
      [this.raydiumProgramId, 'raydium'],
    ] as const) {
      const subId = this.connection.onProgramAccountChange(
        new PublicKey(programId),
        (info, context) => {
          if (this.stopped) return;
          const mint = info.accountId.toBase58();
          const now = Date.now();
          const event: MarketEvent<DiscoveryEventPayload> = {
            id: discoveryEventId('pool_created', mint, context.slot),
            type: 'discovery.pool_created',
            mint,
            timestamp: new Date(now),
            payload: {
              kind: 'pool_created',
              token: { mint, decimals: 6, createdAt: now, source: dex },
              pool: {
                mint,
                poolAddress: mint,
                dex,
                liquidityUsd: 0,
                volumeUsd24h: 0,
                buyTransactions: 0,
                uniqueBuyers: 0,
                poolCreatedAt: now,
              },
            },
          };
          onEvent(event);
        },
        'confirmed',
      );
      this.subscriptions.push(subId);
    }
  }

  async stop(): Promise<void> {
    this.stopped = true;
    for (const id of this.subscriptions) {
      try {
        await this.connection.removeProgramAccountChangeListener(id);
      } catch (err) {
        logger.warn({ err, subId: id }, 'Failed to remove program subscription');
      }
    }
    this.subscriptions = [];
  }
}
