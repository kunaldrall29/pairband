# O14 deepened (fixture-labeled) — payoff analytics without indexer

**Date:** 2026-09-07  
**Branch:** `cursor/api-ui-foundations-4c19`

## Scope (honest)

O12 indexer is **not** complete (O08 blocked on O07). This pass deepens educational payoff packaging for O17:

- `ILLUSTRATIVE_HERO`, `ILLUSTRATIVE_WRITER_LOSS` (800 USDC at spot 1.00)
- `buildEducationalPayoffSeries` chart/table points from integer domain math
- `referenceMarkUnavailable`, `unquotedActiveOptionValue` honesty helpers
- API `/v1/analytics/payoff` returns illustrative `series`; marks stay unavailable

## Not claimed

- No licensed FX reference feed
- No realized trade volume / APR / portfolio marks from chain events
- Not O14 complete until O12

## Commands

```bash
pnpm --filter @pairband/domain test
pnpm --filter @pairband/api test
```
