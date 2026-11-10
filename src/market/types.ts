/** Normalized market data shared by every downstream module. */
export interface TokenInfo {
  mint: string;
  name?: string;
  symbol?: string;
  decimals: number;
  /** Unix ms when the pool/token was first observed. */
  createdAt: number;
  /** Source program that created the token (pumpfun | raydium | unknown). */
  source: 'pumpfun' | 'raydium' | 'unknown';
  /** Address that deployed the token, when known. */
  deployer?: string;
}

export interface PoolInfo {
  mint: string;
  poolAddress: string;
  dex: 'pumpfun' | 'raydium';
  liquidityUsd: number;
  volumeUsd24h: number;
  buyTransactions: number;
  uniqueBuyers: number;
  /** Unix ms when the pool was created. */
  poolCreatedAt: number;
  /** Current price in SOL, when known. */
  priceSol?: number;
  marketCapUsd?: number;
}

export type DiscoveryEventPayload =
  | { kind: 'token_created'; token: TokenInfo }
  | { kind: 'pool_created'; token: TokenInfo; pool: PoolInfo }
  | { kind: 'pool_updated'; pool: PoolInfo }
  | { kind: 'migrated'; token: TokenInfo; pool: PoolInfo };

export interface FilterResult {
  passed: boolean;
  reasons: string[];
}
