-- Reversible down migration for 001_init. Does not silently drop user history in production
-- without an explicit operator decision; this script is for local/dev rollback only.

DROP TABLE IF EXISTS personal_data_retention_policies;
DROP TABLE IF EXISTS early_access_requests;
DROP TABLE IF EXISTS outbox_jobs;
DROP TABLE IF EXISTS notification_preferences;
DROP TABLE IF EXISTS verified_emails;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS auth_nonces;
DROP TABLE IF EXISTS reference_marks;
DROP TABLE IF EXISTS quotes;
DROP TABLE IF EXISTS transaction_intents;
DROP TABLE IF EXISTS trade_fills;
DROP TABLE IF EXISTS lp_positions;
DROP TABLE IF EXISTS token_balances;
DROP TABLE IF EXISTS series_accounting;
DROP TABLE IF EXISTS indexed_events;
DROP TABLE IF EXISTS indexed_blocks;
DROP TABLE IF EXISTS pools;
DROP TABLE IF EXISTS series;
DROP TABLE IF EXISTS deployments;
-- schema_migrations retained so operators can re-apply deliberately
