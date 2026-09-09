# Status — Pairband pay rebuild (2026-09-09)

Source of truth: `docs/PAIRBAND_BUILD_PLAN.md`. Options product deleted.

| Item | Status |
|------|--------|
| Landing copy (cream/ink/gold) | Done |
| Chain config + address book | Done (`packages/config`, `deployments/*`) |
| Pay USDC + memo (P0 path) | Done (app UI + tx builders; needs wallet + faucet for live receipt) |
| Receipt + Activity + CSV | Done (API in-memory store) |
| Banded EURC | Hidden — `eurcRoutesEnabled: false`, no Quoter bound |
| Workspace / hook / idle cash | Not started (Phase 2+) |

## Honesty

- No custody. No APY. No options. No StableFX.
- No audit badge.
- Testnet rehearsal only until mainnet addresses and depth are real.
