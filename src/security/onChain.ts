import { Connection, PublicKey } from '@solana/web3.js';
import { logger } from '../common/logger';
import type { SecurityData } from './types';

/**
 * On-chain facts collector. Uses only public RPC calls:
 *  - getParsedAccountInfo(mint) for mint/freeze authority + supply
 *  - getTokenLargestAccounts(mint) for top-10 concentration
 * Any RPC failure is recorded as a data gap (null), never as "safe".
 */
export class OnChainCollector {
  constructor(private readonly connection: Connection) {}

  async collect(mint: string): Promise<Omit<SecurityData, 'rugCheck' | 'birdeye' | 'dataGaps'>> {
    const pubkey = new PublicKey(mint);
    let mintAuthorityDisabled: boolean | null = null;
    let freezeAuthorityDisabled: boolean | null = null;
    let top10HolderPct: number | null = null;
    let topHolders: SecurityData['topHolders'] = [];
    let devWalletPct: number | null = null;

    try {
      const info = await this.connection.getParsedAccountInfo(pubkey);
      const parsed = (info.value?.data as { parsed?: { info?: Record<string, unknown> } } | undefined)?.parsed?.info;
      if (parsed) {
        mintAuthorityDisabled = parsed['mintAuthority'] == null;
        freezeAuthorityDisabled = parsed['freezeAuthority'] == null;
      }
    } catch (err) {
      logger.warn({ err, mint }, 'Failed to fetch mint account info');
    }

    try {
      const largest = await this.connection.getTokenLargestAccounts(pubkey);
      const supplyInfo = await this.connection.getTokenSupply(pubkey);
      const supply = Number(supplyInfo.value.amount);
      if (supply > 0 && largest.value.length > 0) {
        const top10 = largest.value.slice(0, 10);
        const top10Amount = top10.reduce((s, a) => s + Number(a.amount), 0);
        top10HolderPct = (top10Amount / supply) * 100;
        topHolders = top10.map((a) => ({
          address: a.address.toBase58(),
          pct: (Number(a.amount) / supply) * 100,
        }));
        devWalletPct = topHolders[0]?.pct ?? null;
      }
    } catch (err) {
      logger.warn({ err, mint }, 'Failed to fetch largest token accounts');
    }

    return {
      mint,
      mintAuthorityDisabled,
      freezeAuthorityDisabled,
      top10HolderPct,
      topHolders,
      devWalletPct,
      lpLocked: null, // LP lock verification needs pool-specific logic (Phase 2)
      suspiciousAuthorities: [],
    };
  }
}
