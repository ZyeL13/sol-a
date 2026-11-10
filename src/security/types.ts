/** Structured screening output. Third-party scores are inputs, never verdicts. */
export type RiskClass = 'low' | 'medium' | 'high' | 'critical';

export interface HolderInfo {
  address: string;
  pct: number;
}

export interface SecurityData {
  mint: string;
  mintAuthorityDisabled: boolean | null;
  freezeAuthorityDisabled: boolean | null;
  top10HolderPct: number | null;
  topHolders: HolderInfo[];
  devWallet?: string;
  devWalletPct: number | null;
  /** LP tokens burned/locked, when verifiable; null = could not verify. */
  lpLocked: boolean | null;
  lpOwner?: string;
  metadataUri?: string;
  suspiciousAuthorities: string[];
  /** RugCheck / Birdeye raw data, or null when the provider was unavailable. */
  rugCheck: unknown | null;
  birdeye: unknown | null;
  /** Which providers were unavailable or returned stale data. */
  dataGaps: string[];
}

export interface ScreeningResult {
  mint: string;
  /** 0-100. Higher is safer. */
  score: number;
  risk: RiskClass;
  passed: boolean;
  reasons: string[];
  data: SecurityData;
  screenedAt: Date;
}

export interface SecurityProvider {
  readonly name: string;
  /** Fetch provider data for a mint. Returns null on unavailable/stale data. */
  fetch(mint: string): Promise<unknown | null>;
}
