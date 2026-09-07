# O18 evidence — Protect purchase flow

**Date:** 2026-09-07  
**Branch:** `cursor/api-ui-foundations-4c19`

## Implemented

- `/protect` guided flow: EURC exposure (4dp), market cards from indexer series, exact-output quote fetch
- Review panel: quantity, EURC deliverable, strike, exercise USDC, premium, max spend, spender, expiry, provenance
- Buy disabled when quote `executable:false` (fixture/preview)
- Tx phases via `nextTxPhase`; **Submitted ≠ Purchased**; no success timers
- Intent monitoring registration; purchased only after explicit evidence confirmation

## Tests

- `pnpm --filter @pairband/web test` (protect state machine + exposure units)

## Blockers for funded live buy

- Verified deployment + router/quoter simulation (O10/O13 live path)
- Wallet submit + receipt/balance evidence on Anvil/Arc

## Honesty

- Preview/fixture only for executable=false path in this environment
- Not an audit; not mainnet
