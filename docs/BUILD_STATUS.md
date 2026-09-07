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
| O06 | complete (local) on protocol branches | docs/evidence/o06/ (bootstrap/o06) | Periphery seed O08 after O07; Arc callback suite O10 |
| O07 | complete (local) on protocol branches | — | Router on bootstrap/o07 |
| O08 | complete (local) on protocol branches | — | POSM E2E on bootstrap/o08 |
| O11 | complete (local) | docs/evidence/o11/ | — |
| O12 | complete (local fixtures) | docs/evidence/o12/ | Arc live indexing opt-in only |
| O14 | partial (fixtures) | docs/evidence/o14/ | Full marks/analytics need O12 |
| O15 | stub | docs/evidence/o15/ | Needs O12; email disabled |
| O16 | complete (local) | docs/evidence/o16/ | — |
| O17 | complete (preview) | docs/evidence/o17/ | Screenshots/Playwright matrix optional follow-up |
| O13 | complete (local/fixture) | docs/evidence/o13/ | Live quoter sim needs verified deploy |
| O18 | complete (preview/fixture UI) | docs/evidence/o18/ | Funded Anvil/Arc buy needs verified router |
| O21 | complete (preview/fixture UI) | docs/evidence/o21/ | Live exercise needs verified vault |
| O20 | complete (preview/fixture UI) | docs/evidence/o20/ | Live depth needs indexed trades |
| O19 | complete (preview/fixture UI) | docs/evidence/o19/ | Live mint needs verified vault |
| O09–O10, O22–O32 | pending | — | Arc deploy O10; advanced LP O22 |

### Production / audit / mainnet

| Claim | Status |
| --- | --- |
| Production-grade local vault economics | Core mint/cancel/exercise/redeem + dust/pause/donation tests pass locally |
| API + private preferences foundation | Local Postgres + auth/session/early-access tests pass; no fabricated series |
| Shared app shell / design tokens | Preview shell + wallet state machine; no live finance |
| Public landing (preview) | Illustrative payoff + real early-access persistence; no live markets |
| Canonical RPC indexer (local) | Fixture/Anvil labeled projections + reserve reconcile; no fabricated Arc series |
| Professional security audit | **Not done** — O28 prepares package; this agent cannot self-issue an audit |
| Mainnet ready | **Blocked** — mainnet null; no official Uniswap Arc; Gates 4–5 unmet |
| Funded pilot | **Blocked** on independent review, legal, maker liquidity |

Optional O24/O25/O32: disabled.
