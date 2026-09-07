-- O12 indexer checkpoint / generation tracking.
-- Does not drop chain history; testnet reset increments generation.

CREATE TABLE IF NOT EXISTS indexer_checkpoints (
  chain_id integer NOT NULL,
  generation integer NOT NULL DEFAULT 1,
  last_block bigint NOT NULL DEFAULT 0,
  last_block_hash bytea NOT NULL,
  status text NOT NULL DEFAULT 'ok'
    CHECK (status IN ('ok', 'needs_reconciliation', 'reset')),
  source_label text NOT NULL DEFAULT 'fixture'
    CHECK (source_label IN ('fixture', 'anvil', 'arc-rpc')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chain_id, generation)
);

CREATE INDEX IF NOT EXISTS indexer_checkpoints_active_idx
  ON indexer_checkpoints (chain_id, generation DESC);

ALTER TABLE series
  ADD COLUMN IF NOT EXISTS paused boolean NOT NULL DEFAULT false;

ALTER TABLE series_accounting
  ADD COLUMN IF NOT EXISTS source_label text NOT NULL DEFAULT 'fixture';
