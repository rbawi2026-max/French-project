-- Run once in the Neon SQL Editor before deploying.
CREATE TABLE IF NOT EXISTS couture_events (
  code text PRIMARY KEY CHECK (code ~ '^[A-F0-9]{6}$'),
  state jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
-- This table contains private session tokens. Access it only from server code.
REVOKE ALL ON couture_events FROM PUBLIC;
