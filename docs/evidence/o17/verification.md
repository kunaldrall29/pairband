# O17 evidence — Updated landing with real early access

**Date:** 2026-09-07  
**Branch:** `cursor/api-ui-foundations-4c19`  
**Mode:** preview

## Implemented

Landing sections per `docs/reference/landing.md`: header/banner, hero + illustrative ticket, Protect/Earn/Trade, lifecycle, interactive payoff explorer (domain math), market fixture preview (Example markers, no trade CTA), writer vs LP, Arc/Uniswap, risks, FAQ, early-access form → `POST /v1/early-access`, footer.

Wallet SDK deferred to app routes only. All financial examples labeled illustrative. No fake TVL/APY/audit badges.

## Commands

```bash
pnpm --filter @pairband/domain test
pnpm --filter @pairband/web typecheck
pnpm --filter @pairband/web build
```
