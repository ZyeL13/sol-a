import { logger } from '../common/logger';
import type { MarketDataAdapter } from './adapter';
import type { MarketEvent } from '../common/eventBus';
import type { DiscoveryEventPayload } from './types';

/**
 * Yellowstone gRPC adapter (Phase 1: pluggable stub).
 *
 * The real implementation needs a Yellowstone gRPC provider (e.g. Helius,
 * Triton, or a self-hosted Geyser plugin) plus generated protobuf stubs.
 * Wiring it in now would force an unpinned native dependency on every user,
 * so Phase 1 ships the interface + a clearly-marked stub that fails fast
 * with setup instructions. Swap it in by implementing `MarketDataAdapter`
 * against your provider and passing it to DiscoveryEngine.
 */
export class YellowstoneAdapter implements MarketDataAdapter {
  readonly name = 'yellowstone-grpc';

  constructor(
    private readonly grpcUrl: string,
    private readonly token?: string,
  ) {}

  async start(_onEvent: (event: MarketEvent<DiscoveryEventPayload>) => void): Promise<void> {
    logger.warn({ grpcUrl: this.grpcUrl }, 'Yellowstone adapter is a Phase 1 stub');
    throw new Error(
      'Yellowstone gRPC adapter is not implemented in Phase 1. ' +
        'Set YELLOWSTONE_GRPC_URL to a provider endpoint and implement src/market/yellowstoneAdapter.ts ' +
        'with the provider SDK (see docs/architecture.md), or use SolanaWsAdapter / MockAdapter.',
    );
  }

  async stop(): Promise<void> {
    // No-op: never started.
  }
}
