-- O11 initial schema for Pairband options-v2.
-- Monetary integers: numeric(78,0). Chain times: integer seconds. Service times: timestamptz UTC.
-- Private preferences / early-access are separate from chain-derived projections.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE deployments (
  id bigserial PRIMARY KEY,
  chain_id integer NOT NULL,
  environment text NOT NULL,
  manifest_hash text NOT NULL,
  git_commit text,
  verification_status text NOT NULL DEFAULT 'unverified',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (environment, manifest_hash)
);

CREATE TABLE series (
  chain_id integer NOT NULL,
  series_id bytea NOT NULL,
  vault bytea NOT NULL,
  long_token bytea NOT NULL,
  writer_receipt bytea NOT NULL,
  underlying bytea NOT NULL,
  settlement bytea NOT NULL,
  option_decimals smallint NOT NULL DEFAULT 6 CHECK (option_decimals = 6),
  receipt_decimals smallint NOT NULL DEFAULT 6 CHECK (receipt_decimals = 6),
  underlying_per_unit_6 numeric(78, 0) NOT NULL CHECK (underlying_per_unit_6 >= 0),
  strike_per_unit_6 numeric(78, 0) NOT NULL CHECK (strike_per_unit_6 >= 0),
  trading_start bigint NOT NULL,
  exercise_start bigint NOT NULL,
  exercise_end bigint NOT NULL,
  max_writer_units numeric(78, 0) NOT NULL CHECK (max_writer_units >= 0),
  issuance_fee_bps integer NOT NULL CHECK (issuance_fee_bps >= 0 AND issuance_fee_bps <= 50),
  fee_recipient bytea NOT NULL,
  creation_tx bytea,
  creation_block bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chain_id, series_id),
  UNIQUE (chain_id, vault),
  UNIQUE (chain_id, long_token),
  UNIQUE (chain_id, writer_receipt),
  CHECK (trading_start < exercise_start AND exercise_start < exercise_end)
);

CREATE TABLE pools (
  chain_id integer NOT NULL,
  pool_id bytea NOT NULL,
  series_id bytea NOT NULL,
  currency0 bytea NOT NULL,
  currency1 bytea NOT NULL,
  fee integer NOT NULL,
  tick_spacing integer NOT NULL,
  hooks bytea NOT NULL,
  manager bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chain_id, pool_id),
  UNIQUE (chain_id, series_id),
  FOREIGN KEY (chain_id, series_id) REFERENCES series (chain_id, series_id)
);

CREATE TABLE indexed_blocks (
  chain_id integer NOT NULL,
  block_number bigint NOT NULL,
  block_hash bytea NOT NULL,
  parent_hash bytea NOT NULL,
  block_timestamp bigint NOT NULL,
  provider text NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chain_id, block_number)
);

CREATE TABLE indexed_events (
  id bigserial PRIMARY KEY,
  chain_id integer NOT NULL,
  block_hash bytea NOT NULL,
  tx_hash bytea NOT NULL,
  log_index integer NOT NULL,
  block_number bigint NOT NULL,
  emitter bytea NOT NULL,
  topic0 bytea,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  decoded_schema_version integer NOT NULL DEFAULT 1,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chain_id, block_hash, tx_hash, log_index)
);

CREATE INDEX indexed_events_block_range_idx ON indexed_events (chain_id, block_number);
CREATE INDEX indexed_events_emitter_idx ON indexed_events (chain_id, emitter);

CREATE TABLE series_accounting (
  chain_id integer NOT NULL,
  series_id bytea NOT NULL,
  writer_units numeric(78, 0) NOT NULL DEFAULT 0 CHECK (writer_units >= 0),
  exercised_units numeric(78, 0) NOT NULL DEFAULT 0 CHECK (exercised_units >= 0),
  redeemed_units numeric(78, 0) NOT NULL DEFAULT 0 CHECK (redeemed_units >= 0),
  accounted_usdc6 numeric(78, 0) NOT NULL DEFAULT 0 CHECK (accounted_usdc6 >= 0),
  accounted_eurc6 numeric(78, 0) NOT NULL DEFAULT 0 CHECK (accounted_eurc6 >= 0),
  snapshot_writer_units numeric(78, 0),
  snapshot_usdc6 numeric(78, 0),
  snapshot_eurc6 numeric(78, 0),
  as_of_block bigint,
  as_of_hash bytea,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chain_id, series_id),
  FOREIGN KEY (chain_id, series_id) REFERENCES series (chain_id, series_id)
);

CREATE TABLE token_balances (
  chain_id integer NOT NULL,
  token bytea NOT NULL,
  holder bytea NOT NULL,
  raw_amount numeric(78, 0) NOT NULL DEFAULT 0 CHECK (raw_amount >= 0),
  as_of_block bigint,
  as_of_hash bytea,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chain_id, token, holder)
);

CREATE INDEX token_balances_holder_idx ON token_balances (chain_id, holder);

CREATE TABLE lp_positions (
  chain_id integer NOT NULL,
  position_manager bytea NOT NULL,
  token_id numeric(78, 0) NOT NULL,
  owner bytea NOT NULL,
  pool_id bytea,
  tick_lower integer,
  tick_upper integer,
  liquidity numeric(78, 0) NOT NULL DEFAULT 0 CHECK (liquidity >= 0),
  amount0 numeric(78, 0) NOT NULL DEFAULT 0 CHECK (amount0 >= 0),
  amount1 numeric(78, 0) NOT NULL DEFAULT 0 CHECK (amount1 >= 0),
  fees0 numeric(78, 0) NOT NULL DEFAULT 0 CHECK (fees0 >= 0),
  fees1 numeric(78, 0) NOT NULL DEFAULT 0 CHECK (fees1 >= 0),
  as_of_block bigint,
  as_of_hash bytea,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chain_id, position_manager, token_id)
);

CREATE TABLE trade_fills (
  id bigserial PRIMARY KEY,
  chain_id integer NOT NULL,
  event_id bigint NOT NULL UNIQUE REFERENCES indexed_events (id),
  pool_id bytea,
  series_id bytea,
  side text,
  option_units numeric(78, 0) CHECK (option_units IS NULL OR option_units >= 0),
  usdc6 numeric(78, 0) CHECK (usdc6 IS NULL OR usdc6 >= 0),
  account bytea,
  provenance text NOT NULL DEFAULT 'indexer',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE transaction_intents (
  id bigserial PRIMARY KEY,
  account bytea NOT NULL,
  client_intent_id text NOT NULL,
  action text NOT NULL,
  series_id bytea,
  chain_id integer NOT NULL,
  request_digest bytea NOT NULL,
  status text NOT NULL DEFAULT 'monitoring',
  known_hashes bytea[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account, client_intent_id)
);

CREATE TABLE quotes (
  quote_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account bytea NOT NULL,
  series_id bytea NOT NULL,
  side text NOT NULL,
  option_units numeric(78, 0) NOT NULL CHECK (option_units > 0),
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  quote_block bigint,
  expires_at timestamptz NOT NULL,
  route_hash bytea,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX quotes_expires_idx ON quotes (expires_at);

CREATE TABLE reference_marks (
  id bigserial PRIMARY KEY,
  pair text NOT NULL,
  source text NOT NULL,
  observed_at timestamptz NOT NULL,
  price_decimal text NOT NULL,
  units text NOT NULL,
  stale boolean NOT NULL DEFAULT false,
  method text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pair, source, observed_at)
);

CREATE TABLE auth_nonces (
  nonce_hash bytea PRIMARY KEY,
  address bytea NOT NULL,
  domain text NOT NULL,
  uri text NOT NULL,
  chain_id integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE INDEX auth_nonces_address_idx ON auth_nonces (address, expires_at);

CREATE TABLE sessions (
  token_hash bytea PRIMARY KEY,
  address bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  user_agent_hash bytea,
  ip_hash bytea
);

CREATE INDEX sessions_address_idx ON sessions (address);
CREATE INDEX sessions_expires_idx ON sessions (expires_at);

CREATE TABLE verified_emails (
  id bigserial PRIMARY KEY,
  account bytea NOT NULL,
  normalized_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  challenge_hash bytea,
  challenge_expires_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account, normalized_email)
);

CREATE TABLE notification_preferences (
  id bigserial PRIMARY KEY,
  account bytea NOT NULL,
  series_id bytea NOT NULL,
  channel text NOT NULL CHECK (channel = 'email'),
  enabled boolean NOT NULL DEFAULT false,
  verified_email_id bigint REFERENCES verified_emails (id),
  schedule_codes text[] NOT NULL DEFAULT '{}',
  consent_version text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account, series_id, channel)
);

CREATE TABLE outbox_jobs (
  job_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key text NOT NULL UNIQUE,
  kind text NOT NULL,
  payload_reference jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 8,
  lease_until timestamptz,
  next_run_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX outbox_jobs_ready_idx ON outbox_jobs (status, next_run_at, lease_until);

CREATE TABLE early_access_requests (
  id bigserial PRIMARY KEY,
  normalized_email text NOT NULL UNIQUE,
  role text NOT NULL,
  intended_use text,
  exposure_band text,
  privacy_acknowledged boolean NOT NULL,
  privacy_version text NOT NULL,
  product_updates_opt_in boolean NOT NULL DEFAULT false,
  client_request_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (privacy_acknowledged = true),
  CHECK (char_length(coalesce(intended_use, '')) <= 500)
);

CREATE TABLE personal_data_retention_policies (
  dataset text PRIMARY KEY,
  retention_days integer,
  deletion_method text NOT NULL,
  notes text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO personal_data_retention_policies (dataset, retention_days, deletion_method, notes) VALUES
  ('early_access_requests', 730, 'hard_delete_on_request', 'PII excluded from public exports; deletion on verified request'),
  ('verified_emails', 365, 'anonymize_or_delete', 'Requires account ownership proof; challenge hashes rotate'),
  ('notification_preferences', 365, 'delete_with_account', 'Revoked consent disables dispatch before retention expiry'),
  ('sessions', 30, 'expire_and_purge', 'Opaque cookie tokens hashed at rest'),
  ('auth_nonces', 1, 'expire_and_purge', 'One-time bounded nonces')
ON CONFLICT (dataset) DO NOTHING;
