# sol-a — Architecture

Phase 1: discovery, security screening, persistence. Paper trading only.

## Module map

```mermaid
flowchart TD
    A[Solana WS Adapter\nor Yellowstone gRPC\nor MockAdapter] --> B[DiscoveryEngine]
    B -->|discovery.pool_created| C[EventBus\n(dedup, idempotent)]
    C -->|discovery.passed| D[ScreeningService]
    D -->|screening.completed| C
    C --> E[Postgres / InMemory\nRepository]
    C -->|screening.passed| F[Phase 2: StrategyEngine]
    F --> G[Phase 2: RiskEngine\n(absolute veto)]
    G --> H[Phase 3: ExecutionEngine\nJupiter + Jito]
    H --> I[Phase 4: PositionMonitor\n+ Telegram]
    J[HealthChecker] --> K[HTTP :3000 /health]
```

## Event flow

1. **Adapter** translates provider data into normalized `discovery.pool_created`
   events (`{ kind, token, pool }`). Adapters: `SolanaWsAdapter` (default),
   `YellowstoneAdapter` (Phase 1 stub — implement against your gRPC provider),
   `MockAdapter` (tests / demos).
2. **DiscoveryEngine** applies the initial filters
   (`MIN_LIQUIDITY_USD`, `MIN_VOLUME_USD`, `MAX_POOL_AGE_SECONDS`,
   `MIN_BUY_TRANSACTIONS`, `MIN_UNIQUE_BUYERS`) and publishes
   `discovery.passed` only for survivors. A mint is processed at most once.
3. **ScreeningService** collects on-chain facts (mint/freeze authority,
   top-10 holders via `getTokenLargestAccounts`) plus RugCheck / Birdeye
   data, scores deterministically (see `src/security/scoring.ts`), and
   publishes `screening.completed` / `screening.passed`.
4. **Repository** persists every event (idempotent by event id), tokens,
   pools, screenings, and an append-only `decision_log` audit trail.

## Communication

All modules communicate through the in-process `EventBus` (async, dedup by
event id, handler errors isolated). No direct calls between discovery and
screening — either side can be replaced without touching the other.

## Scoring rules (Phase 1)

Score starts at 100. Deductions: mint authority enabled −40 (hard reject),
freeze authority enabled −25 (hard reject), top-10 > limit −30 (hard
reject), dev wallet >50% −25 (hard reject), dev >20% −15, LP not locked
−15, LP unverifiable −5, suspicious authorities −10 each (max −20),
unknown authority −30/−20, unknown top-10 −15, provider data gaps −5
each (max −10). Pass requires no hard reject and score ≥
`MIN_SECURITY_SCORE` (default 60). Third-party scores are recorded for
audit only — they never decide a pass.

## Database

See `db/migrations/001_init.sql`: `tokens`, `pools`, `screenings`,
`events` (idempotent by id), `decision_log` (append-only audit).

## Reliability

- Structured JSON logging (pino).
- `withRetry` — exponential backoff + jitter, retryable errors only.
- `CircuitBreaker` around every third-party provider.
- Health endpoint `GET /` on `PORT` (default 3000) aggregating DB +
  discovery checks.
- Graceful shutdown on SIGINT/SIGTERM; adapter subscriptions removed,
  HTTP server closed, DB pool drained.
- Idempotent event processing everywhere (event ids, `ON CONFLICT DO NOTHING`).

## Yellowstone gRPC

Phase 1 ships the adapter interface and a stub that fails fast with
instructions. To enable it: implement `MarketDataAdapter` with your
provider's SDK (Helius/Triton/self-hosted Geyser), set
`YELLOWSTONE_GRPC_URL` / `YELLOWSTONE_GRPC_TOKEN`, and pass the adapter to
`DiscoveryEngine`. The WebSocket adapter is the default until then.

## What is NOT in Phase 1

Strategy evaluation, risk management (beyond the stub contract), paper
trading simulation, Jupiter/Jito execution, exit monitoring, Telegram
alerts, dashboard. Their interfaces live under `src/strategy`,
`src/risk`, `src/execution`, `src/monitoring`, `src/notifications` and are
clearly marked as stubs.
