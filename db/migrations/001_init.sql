-- 001_init.sql — Phase 1 schema
-- Tokens, pools, screenings, events, decision log (audit trail).

CREATE TABLE IF NOT EXISTS tokens (
  mint            TEXT PRIMARY KEY,
  name            TEXT,
  symbol          TEXT,
  decimals        SMALLINT NOT NULL DEFAULT 6,
  source          TEXT NOT NULL DEFAULT 'unknown',
  deployer        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pools (
  pool_address    TEXT PRIMARY KEY,
  mint            TEXT NOT NULL REFERENCES tokens(mint),
  dex             TEXT NOT NULL,
  liquidity_usd   NUMERIC(20,2) NOT NULL DEFAULT 0,
  volume_usd_24h  NUMERIC(20,2) NOT NULL DEFAULT 0,
  buy_transactions INTEGER NOT NULL DEFAULT 0,
  unique_buyers   INTEGER NOT NULL DEFAULT 0,
  pool_created_at TIMESTAMPTZ NOT NULL,
  price_sol       NUMERIC(20,10),
  market_cap_usd  NUMERIC(20,2),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pools_mint ON pools(mint);

CREATE TABLE IF NOT EXISTS screenings (
  id              SERIAL PRIMARY KEY,
  mint            TEXT NOT NULL REFERENCES tokens(mint),
  score           SMALLINT NOT NULL,
  risk            TEXT NOT NULL,
  passed          BOOLEAN NOT NULL,
  reasons         JSONB NOT NULL DEFAULT '[]',
  data            JSONB NOT NULL DEFAULT '{}',
  screened_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_screenings_mint ON screenings(mint);

CREATE TABLE IF NOT EXISTS events (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL,
  mint            TEXT,
  payload         JSONB NOT NULL DEFAULT '{}',
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_mint ON events(mint);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

-- Append-only audit log: every screening / signal / (later) trade decision.
CREATE TABLE IF NOT EXISTS decision_log (
  id              SERIAL PRIMARY KEY,
  mint            TEXT,
  decision        TEXT NOT NULL,
  reason          TEXT,
  details         JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_decision_log_mint ON decision_log(mint);
