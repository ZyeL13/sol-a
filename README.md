# sol-a

Modular, event-driven Solana memecoin trading system. **Phase 1 is paper
trading only — live trading is never enabled by default** (`TRADING_MODE=live`
is rejected at startup).

Phase 1 delivers: token discovery (Pump.fun + Raydium), initial filters,
security screening (mint/freeze authority, holder concentration, dev
concentration, LP lock, RugCheck + Birdeye with explicit data-gap handling),
PostgreSQL persistence, structured logging, health checks, retry /
circuit-breaker reliability, and graceful shutdown.

## Quick start

```bash
cp .env.example .env        # edit RPC / API keys; never commit .env
npm install
npm run build
npm test
```

## Run with Postgres + Redis (Docker)

```bash
docker compose up -d        # postgres:16 + redis:7
npm run db:migrate          # applies db/migrations/001_init.sql
npm start                   # HTTP health endpoint on PORT (default 3000)
```

Without Docker, the unit/integration tests run against the in-memory
repository — no live database is required to develop or test.

## Development

```bash
npm run dev                 # ts-node, watch-free
npm run lint
npm run format
```

## Configuration

All tunables live in `.env` (see `.env.example`) and are validated at
startup in `src/config/`:

- `config.ts` — RPC, Yellowstone, RugCheck/Birdeye, Jupiter/Jito URLs
- `risk.config.ts` — `POSITION_SIZE_SOL`, `MAX_OPEN_POSITIONS`,
  `MAX_PORTFOLIO_EXPOSURE_PCT`, `DAILY_MAX_LOSS_SOL`,
  `MAX_DRAWDOWN_PCT`, `MAX_CONSECUTIVE_LOSSES`,
  `MAX_PER_TOKEN_EXPOSURE_PCT`, `TAKE_PROFIT_PCT`, `STOP_LOSS_PCT`,
  `TRAILING_STOP_PCT`, `MAX_SLIPPAGE_BPS`, `PRIORITY_FEE_LAMPORTS`,
  `JITO_TIP_SOL`
- `strategy.config.ts` — `MIN_LIQUIDITY_USD`, `MIN_VOLUME_USD`,
  `MAX_POOL_AGE_SECONDS`, `MIN_BUY_TRANSACTIONS`, `MIN_UNIQUE_BUYERS`,
  `MAX_TOP10_HOLDER_PCT`, `REQUIRE_MINT_DISABLED`,
  `REQUIRE_FREEZE_DISABLED`, `MIN_SECURITY_SCORE`,
  `MIN_SIGNAL_CONFIDENCE`, `SIGNAL_TTL_SECONDS`, `MAX_HOLDING_SECONDS`

Never hardcode private keys or API credentials.

## Project structure

```
src/
  config/          env / risk / strategy config (validated with zod)
  common/          logger, errors, retry, circuit breaker, event bus, health
  market/          discovery engine, filters, adapters (WS / Yellowstone stub / mock)
  security/        screening service, scoring, on-chain collector, RugCheck, Birdeye
  db/              migrations runner, Postgres + in-memory repositories
  strategy/        Phase 2 stub (interface + always-SKIP engine)
  risk/            Phase 2 stub (interface + kill-switch/cap engine)
  execution/       Phase 3 stub (Jupiter/Jito interface)
  monitoring/      Phase 4 stub (exit decision interface)
  notifications/   Phase 4 stub (Telegram notifier)
db/migrations/     001_init.sql (tokens, pools, screenings, events, decision_log)
tests/             unit + integration (mock RPC / mock fetch)
docs/              architecture.md
```

## Phases

- **Phase 1 (this repo):** structure, config, discovery, screening,
  Postgres persistence. ✅
- **Phase 2:** strategy engine, risk management, paper trading simulator,
  backtesting.
- **Phase 3:** Jupiter integration, simulation, Jito, live execution with
  strict position limits.
- **Phase 4:** dashboard, Telegram notifications, analytics, optimization.

Each phase is independently testable.

## Deployment / VPS recommendations

Minimum for Phase 1 (discovery + screening, no execution):

- **CPU:** 2 vCPU — the WS adapter and screening are I/O-bound; 1 vCPU
  works for a single stream but leaves no headroom.
- **RAM:** 2 GB (Node heap ~512 MB is plenty; Postgres + Redis take the rest).
- **Disk:** 20 GB SSD (Postgres grows with events; prune `events` older
  than 30 days in production).
- **Network:** low latency to your RPC provider matters more than
  bandwidth; co-locate the VPS with your Yellowstone/RPC region.
- **OS:** Ubuntu 22.04/24.04 LTS, Node.js 20+, Docker + Docker Compose.
- Run behind a process manager (`systemd` or `pm2`), `NODE_ENV=production`,
  and point `DATABASE_URL` / `REDIS_URL` at managed services for anything
  beyond a dev box.

## Safety

- No live trading in Phase 1. No private keys in the codebase or config
  examples. Third-party safety scores are never treated as guarantees;
  unavailable or stale provider data is recorded as a data gap and
  penalized in the screening score.
- Every trade decision (Phase 2+) must pass the risk engine, which has
  absolute veto power, and must be written to `decision_log`.
