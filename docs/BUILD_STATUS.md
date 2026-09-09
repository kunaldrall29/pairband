# Status — Pairband pay rebuild

Source of truth: `docs/PAIRBAND_BUILD_PLAN.md`. Options product deleted.

| Item | Status |
|------|--------|
| Landing copy + outcome preview | Done |
| Chain config + address book | Done |
| Pay USDC via Arc `Memo.memo` (one tx) | Done |
| Receipt + Activity + CSV | Done (Postgres) |
| Banded EURC | Hidden — no Uniswap Quoter on Arc testnet |
| SIWE + Workspace (orgs, roles, payees, limits) | Done |
| Hold cash (idle lending) | Labeled off — no APY |
| `PairbandPay` receipt helper | Scaffold only (optional; Memo is P0 path) |
| v4 hook / convert fill | Not started — blocked on pool depth + audit |

## Honesty

- No custody. No APY. No options. No StableFX. No audit badge.
- Testnet rehearsal (`5042002`). Mainnet addresses unbound until Circle publishes them.
- Uniswap factory/router addresses probed empty on Arc testnet → EURC routes refuse loudly.
