# Build status

Product: Pairband options-v2.

**Readiness labels (honest):** local vault + v4 hook tests ≠ audited ≠ Arc-verified ≠ mainnet-ready ≠ official Uniswap on Arc.

| Stage | Status | Evidence | Blocker / next |
| --- | --- | --- | --- |
| O00 | complete | docs/evidence/o00/ | — |
| O01 | complete | docs/evidence/o01/ | Official Uniswap v4 on Arc absent; Pairband-deployed testnet path |
| O02 | complete | packages/domain + docs/evidence/o02/ | — |
| O03 | complete (local) | packages/contracts + docs/evidence/o03/ | Arc deploy / explorer verify = O10 |
| O04 | complete (local) | mint/cancel forge tests | Arc-specific token behavior = O10 |
| O05 | complete (local) | exercise/redeem + dust forge tests | Independent review still required |
| O06 | complete (local) | docs/evidence/o06/ | Periphery seed O08; Arc callback suite O10; not official Uniswap |
| O07–O32 | pending | — | O07 narrow router next |

### Production / audit / mainnet

| Claim | Status |
| --- | --- |
| Production-grade local vault economics | Core mint/cancel/exercise/redeem + dust/pause/donation tests pass locally |
| Local v4 lifecycle hook | CREATE2 permissions + real PoolManager callbacks pass locally |
| Professional security audit | **Not done** — O28 prepares package; this agent cannot self-issue an audit |
| Mainnet ready | **Blocked** — mainnet null; no official Uniswap Arc; Gates 4–5 unmet |
| Funded pilot | **Blocked** on independent review, legal, maker liquidity |

Optional O24/O25/O32: disabled. Circle App Kit not assumed for option-token swaps.
