#!/usr/bin/env bash
# Operator runbook — Pairband P0/P1 rehearsal
set -euo pipefail

echo "1. Ensure Postgres: DATABASE_URL=postgres://pairband:pairband@127.0.0.1:5432/pairband"
echo "2. pnpm install"
echo "3. pnpm --filter @pairband/database migrate"
echo "4. pnpm dev  # web :3000 api :3001"
echo "5. Faucet Arc testnet USDC; connect wallet on /app/pay"
echo "6. Same-asset pay uses Memo.memo(USDC, transfer, memoId, memoData) — one tx"
echo "7. Kill EURC: set eurcRoutesEnabled false in packages/config (already default)"
echo "8. Never advertise FX without measured pool depth"
