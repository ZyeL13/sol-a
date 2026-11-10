import { HttpSecurityProvider } from './httpClient';

/** Birdeye — token security / holder endpoints. Requires an API key. */
export class BirdeyeProvider extends HttpSecurityProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {
    super('birdeye');
  }

  protected buildUrl(mint: string): string {
    return `${this.baseUrl.replace(/\/$/, '')}/defi/token_security?address=${mint}`;
  }

  protected buildInit(): RequestInit {
    return { headers: { accept: 'application/json', 'X-API-KEY': this.apiKey } };
  }

  /** Without a key the provider is unusable — report that explicitly. */
  async fetch(mint: string): Promise<unknown | null> {
    if (!this.apiKey) return null;
    return super.fetch(mint);
  }
}
