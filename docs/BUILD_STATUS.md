# Build status

Product: Pairband options-v2.

**Readiness labels (honest):** local vault lifecycle implemented ≠ audited ≠ Arc-verified ≠ mainnet-ready.

| Stage | Status | Evidence | Blocker / next |
| --- | --- | --- | --- |
| O00 | complete | docs/evidence/o00/ | — |
| O01 | complete | docs/evidence/o01/ | Official Uniswap v4 on Arc absent; Pairband-deployed testnet path planned |
| O02 | complete | packages/domain + docs/evidence/o02/ | — |
| O03 | complete (local) | packages/contracts + docs/evidence/o03/ | Arc deploy / explorer verify = O10 |
| O04 | complete (local) | mint/cancel forge tests | Arc-specific token behavior = O10 |
| O05 | complete (local) | exercise/redeem + dust forge tests | Independent review still required |
| O11 | complete (local) | docs/evidence/o11/ | Indexer O12 next for series data; email provider disabled |
| O14 | stub | docs/evidence/o14/ | Needs O12 for realized analytics; reference marks unavailable |
| O15 | stub | docs/evidence/o15/ | Needs O12; provider disabled; outbox leases work locally |
| O16 | complete (local) | docs/evidence/o16/ | Landing O17; flows O18+ after quotes |
| O06–O10, O12–O13, O17–O32 | pending | — | Protocol O06 lifecycle hook; service O12 indexer |

### Production / audit / mainnet

| Claim | Status |
| --- | --- |
| Production-grade local vault economics | Core mint/cancel/exercise/redeem + dust/pause/donation tests pass locally |
| API + private preferences foundation | Local Postgres + auth/session/early-access tests pass; no fabricated series |
| Shared app shell / design tokens | Preview shell + wallet state machine; no live finance |
| Professional security audit | **Not done** — O28 prepares package; this agent cannot self-issue an audit |
| Mainnet ready | **Blocked** — mainnet null; no official Uniswap Arc; Gates 4–5 unmet |
| Funded pilot | **Blocked** on independent review, legal, maker liquidity |

Optional O24/O25/O32: disabled.
