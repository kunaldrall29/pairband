# O11 evidence — Database, API foundation and private preferences

**Date:** 2026-09-07  
**Branch:** `cursor/api-ui-foundations-4c19`  
**Mode:** preview (default)

## What was implemented

- Postgres schema + reversible migration `packages/database/migrations/001_init.sql` / `.down.sql`
- Typed query helpers: early access, auth nonces/sessions, notification preferences, outbox leases
- Fastify API: `/health`, `/ready`, `/v1/deployment`, `/v1/early-access`, `/v1/auth/*`, `/v1/me/reminders`, `/v1/me/email/verify`, `/v1/ops/outbox`
- Series list returns `503 INDEXER_UNAVAILABLE` (no invented live series)
- Reference marks typed `unavailable` (no fabricated FX prices)
- Email provider remains `disabled`; verification tokens are not logged

## Commands run

```bash
sudo pg_ctlcluster 16 main start
# DATABASE_URL=postgres://pairband:pairband@127.0.0.1:5432/pairband
pnpm --filter @pairband/database run migrate up
pnpm --filter @pairband/database test
pnpm --filter @pairband/api test
pnpm --filter @pairband/api typecheck
pnpm --filter @pairband/api build
```

## Observed results

- Migration `001_init` applied successfully
- Database tests: early-access dedupe, nonce replay/wrong domain, session lookup, outbox claim — pass
- API tests: health preview, early-access identical 202, SIWE-style verify + nonce replay 409, CSRF 403 without token, series 503, payoff illustrative 10800 — pass

## Honesty / blockers

- Docker Compose not available in this environment; local apt Postgres 16 used instead
- Indexer (O12) not present — series endpoints intentionally unavailable
- No email delivery claimed; provider disabled
- Session ≠ token ownership for financial actions
- Not an audit; not mainnet-ready
