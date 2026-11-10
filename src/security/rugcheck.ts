import { HttpSecurityProvider } from './httpClient';

/** RugCheck (https://rugcheck.xyz) — free, no key required. */
export class RugCheckProvider extends HttpSecurityProvider {
  constructor(private readonly baseUrl: string) {
    super('rugcheck');
  }

  protected buildUrl(mint: string): string {
    return `${this.baseUrl.replace(/\/$/, '')}/tokens/${mint}/report`;
  }

  protected buildInit(): RequestInit {
    return { headers: { accept: 'application/json' } };
  }
}
