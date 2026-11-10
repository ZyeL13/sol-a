import { createServer } from 'node:http';
import { Connection } from '@solana/web3.js';
import { EventBus } from './common/eventBus';
import { HealthChecker } from './common/health';
import { logger } from './common/logger';
import { env } from './config/config';
import { riskConfig } from './config/risk.config';
import { strategyConfig } from './config/strategy.config';
import { PostgresTokenRepository } from './db/postgresRepository';
import type { TokenRepository } from './db/repository';
import { DiscoveryEngine } from './market/discovery';
import { MockAdapter } from './market/mockAdapter';
import { SolanaWsAdapter } from './market/solanaWsAdapter';
import { YellowstoneAdapter } from './market/yellowstoneAdapter';
import type { DiscoveryEventPayload } from './market/types';
import { BirdeyeProvider } from './security/birdeye';
import { RugCheckProvider } from './security/rugcheck';
import { ScreeningService } from './security/screening';
import type { ScreeningResult } from './security/types';

/**
 * Phase 1 application: discovery -> filters -> screening -> persistence.
 * Paper trading only. No execution engine is wired in Phase 1.
 */
export class App {
  private readonly bus = new EventBus();
  private readonly health = new HealthChecker();
  private readonly repository: TokenRepository;
  private readonly discovery: DiscoveryEngine;
  private readonly screening: ScreeningService;
  private server: ReturnType<typeof createServer> | null = null;
  private shuttingDown = false;

  constructor(opts: { useMockAdapter?: boolean } = {}) {
    const connection = new Connection(env.SOLANA_RPC_URL, { wsEndpoint: env.SOLANA_WS_URL });
    this.repository = new PostgresTokenRepository(env.DATABASE_URL);
    const adapter = opts.useMockAdapter
      ? new MockAdapter([])
      : env.YELLOWSTONE_GRPC_URL
        ? new YellowstoneAdapter(env.YELLOWSTONE_GRPC_URL, env.YELLOWSTONE_GRPC_TOKEN)
        : new SolanaWsAdapter(env.SOLANA_RPC_URL, env.SOLANA_WS_URL, env.PUMPFUN_PROGRAM_ID, env.RAYDIUM_AMM_PROGRAM_ID);

    this.discovery = new DiscoveryEngine(adapter, this.bus, strategyConfig);
    this.screening = new ScreeningService(
      this.bus,
      strategyConfig,
      [new RugCheckProvider(env.RUGCHECK_API_URL), new BirdeyeProvider(env.BIRDEYE_API_URL, env.BIRDEYE_API_KEY)],
      connection,
    );

    this.health.register('database', async () => ({
      status: (await this.repository.ping()) ? 'ok' : 'fail',
      detail: 'postgres ping',
    }));
    this.health.register('discovery', async () => ({
      status: 'ok',
      detail: `processed ${this.discovery.processedCount()} mints`,
    }));

    // Persistence: every bus event is stored (idempotent by event id).
    this.bus.subscribe('*', async (event) => {
      try {
        await this.repository.saveEvent(event.id, event.type, event.mint, event.payload);
        if (event.type === 'discovery.passed') {
          const payload = event.payload as DiscoveryEventPayload;
          if (payload.kind === 'pool_created') {
            await this.repository.upsertToken(payload.token);
            await this.repository.upsertPool(payload.pool);
          } else if (payload.kind === 'pool_updated') {
            await this.repository.upsertPool(payload.pool);
          }
        }
        if (event.type === 'screening.completed') {
          const result = event.payload as ScreeningResult;
          await this.repository.saveScreening(result);
          await this.repository.logDecision(
            result.mint,
            result.passed ? 'SCREENING_PASS' : 'SCREENING_REJECT',
            result.reasons.join('; '),
            { score: result.score, risk: result.risk },
          );
        }
      } catch (err) {
        logger.error({ err, eventId: event.id }, 'Failed to persist event');
      }
    });
  }

  async start(): Promise<void> {
    this.screening.start();
    await this.discovery.start();
    this.server = createServer(async (_req, res) => {
      const status = await this.health.check();
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(status));
    });
    this.server.listen(env.PORT, () => {
      logger.info(
        { port: env.PORT, mode: env.TRADING_MODE, risk: riskConfig.MAX_OPEN_POSITIONS },
        'sol-a Phase 1 started (paper trading only)',
      );
    });
    this.installShutdownHooks();
  }

  async stop(): Promise<void> {
    if (this.shuttingDown) return;
    this.shuttingDown = true;
    logger.info('Shutting down gracefully…');
    await this.discovery.stop();
    if (this.server) await new Promise<void>((resolve) => this.server?.close(() => resolve()));
    const repo = this.repository as PostgresTokenRepository;
    if (typeof repo.close === 'function') await repo.close();
    logger.info('Shutdown complete');
  }

  private installShutdownHooks(): void {
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.on(signal, () => {
        void this.stop().then(() => process.exit(0));
      });
    }
  }
}
