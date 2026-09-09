# Pairband

Pay and convert listed stables on Circle Arc — exact-out payouts with onchain memos, inside a price band.

**Product status:** Pre-mainnet · Rehearsal on Arc testnet (`5042002`)

## What this is

- **Pay** — exact-out to an address or payee, with an Arc memo
- **Convert** — same engine, no recipient
- **Workspace** — orgs, roles, limits (Phase 2)

Not an options venue, yield farm, custodian, or StableFX frontend. See [`docs/PAIRBAND_BUILD_PLAN.md`](docs/PAIRBAND_BUILD_PLAN.md).

## Monorepo

| Path | Role |
|------|------|
| `apps/web` | Next.js 15 landing + app |
| `apps/api` | Waitlist, quotes, receipts log |
| `packages/config` | Arc chain + address book |
| `packages/domain` | Band math, quote expiry |
| `packages/contracts` | Optional `PairbandPay` (P2+) |
| `docs/` | Build plan and operator notes |

## Quick start

```bash
pnpm install
pnpm dev
```

- Landing + app: http://localhost:3000
- API: http://localhost:3001

## P0 build order

1. Landing copy (design system unchanged)
2. Chain config + address book
3. Pay USDC + Arc Memo
4. Receipt + Activity
5. Banded EURC only if a pool can fill

## License

Apache-2.0
