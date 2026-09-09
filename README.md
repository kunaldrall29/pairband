# Pairband

Pay and convert listed stables on Circle Arc — exact-out payouts with onchain memos, inside a price band.

**Product status:** Pre-mainnet · Rehearsal on Arc testnet (`5042002`)

## What this is

- **Pay** — exact-out via Arc `Memo.memo` wrapping USDC transfer (one tx)
- **Convert** — same engine; **hidden** until a Uniswap pool can fill
- **Workspace** — SIWE, orgs, roles, limits, payees, CSV

Not an options venue, yield farm, custodian, or StableFX frontend. See [`docs/PAIRBAND_BUILD_PLAN.md`](docs/PAIRBAND_BUILD_PLAN.md).

## Quick start

```bash
# Postgres (local)
export DATABASE_URL=postgres://pairband:pairband@127.0.0.1:5432/pairband
pnpm install
pnpm db:migrate
pnpm dev
```

- Landing + app: http://localhost:3000  
- API: http://localhost:3001  
- App: http://localhost:3000/app

## Monorepo

| Path | Role |
|------|------|
| `apps/web` | Next.js 15 landing + app |
| `apps/api` | Waitlist, SIWE, quotes, orgs, receipts |
| `packages/config` | Arc chain + address book |
| `packages/domain` | Band math |
| `packages/database` | Drizzle schema + migrations |
| `packages/contracts` | Optional `PairbandPay` receipt helper |
| `docs/` | Build plan, decisions, runbook |

## Honesty bounds

- EURC routes refuse until Quoter + depth exist
- No APY, no custody, no audit badge
- Mainnet addresses bind the day Circle publishes them

## License

Apache-2.0
