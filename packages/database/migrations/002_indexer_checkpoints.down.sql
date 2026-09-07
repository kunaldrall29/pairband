DROP INDEX IF EXISTS indexer_checkpoints_active_idx;
DROP TABLE IF EXISTS indexer_checkpoints;
-- paused / source_label columns retained (non-destructive down)
