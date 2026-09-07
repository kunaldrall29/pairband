# O16 evidence — Shared design system, app shell and wallet states

**Date:** 2026-09-07  
**Branch:** `cursor/api-ui-foundations-4c19`  
**Mode:** preview

## What was implemented

- `@pairband/ui` tokens matching landing/app specs (Manrope / Inter / IBM Plex Mono via `next/font`)
- AppShell: 224px sidebar, 64px top bar, mobile bottom tabs Protect/Earn/Markets/Portfolio
- Formatters distinguishing USDC, EURC, options, USDC/EURC, USDC/option
- Tx state machine covering rejected / stale quote / unknown / network_changed
- wagmi + viem Arc testnet config with injected connector; browse without connect
- Protect route demos: AmountInput, DataFreshness, RiskNotice, TransactionProgress
- Empty/loading honesty: no fabricated balances or quotes

## Commands run

```bash
pnpm --filter @pairband/ui test
pnpm --filter @pairband/web typecheck
pnpm --filter @pairband/web build
pnpm --filter @pairband/web test
```

## Observed results

- UI unit tests pass (tokens, formatters, tx machine)
- Next.js production build succeeds; routes for protect/earn/markets/portfolio/activity/settings/status/fund/risk generate
- Preview mode default; financial actions not enabled

## Blockers / follow-ups

- Full Playwright 320/390/768/1440 matrix not executed in this pass (no headed browser automation requested)
- WalletConnect transitive warning during build (injected-only connector used; WC not required)
- Live markets still blocked on O12 indexer + O13 quotes
