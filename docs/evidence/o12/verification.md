# O12 evidence — Canonical RPC indexer and reserve reconciliation

**Date:** 2026-09-07  
**Branch:** `cursor/api-ui-foundations-4c19`

## Prerequisites verified

- O05 vault lifecycle (local)
- O06 lifecycle hook (protocol bootstrap / o06 evidence)
- O08 PositionManager E2E (protocol bootstrap / o08 — prerequisites satisfied per operator)
- O11 database/API foundation (this branch)

## Implemented

- `@pairband/indexer`: frozen Pairband event ABI fragments (MarketRegistered matched to `PairbandLifecycleHook`), ordered ingest with dedupe, checkpoint conflict → `needs_reconciliation`, generation reset, projections (series accounting, pools, ERC20 balances, router trade attribution), independent reconcile (donations detected without minting claims), lag/stale helpers
- Migration `002_indexer_checkpoints`
- Worker: `INDEXER_MODE=fixture|anvil|disabled` (default disabled); **arc-rpc not auto-run**
- API: `/v1/indexer/status`; `/v1/series` returns fixture-indexed read model when `INDEXER_MODE=fixture|anvil`, else honest `INDEXER_UNAVAILABLE` — never invents live Arc series

## Commands

```bash
pnpm --filter @pairband/indexer test
pnpm --filter @pairband/database migrate up
INDEXER_MODE=fixture pnpm --filter @pairband/worker exec tsx src/index.ts
pnpm --filter @pairband/api test
pnpm --filter @pairband/sdk test
```

## Results

- Indexer tests: 6/6 pass
- SDK tests: 6/6 pass
- API tests: 4/4 pass (fixture `/v1/series` labeled; quotes UNVERIFIED in preview)
- Migration `002_indexer_checkpoints` present
- Worker fixture tick: serializes BigInt-safe JSON summary

## Honesty

- No fabricated Arc chain data
- Fixture/Anvil labeled distinctly from `arc-rpc`
- Not an audit; not mainnet-ready
