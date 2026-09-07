# Build status

Product: Pairband options-v2.

**Readiness labels (honest):** local vault + v4 hook + narrow router tests ≠ audited ≠ Arc-verified ≠ mainnet-ready ≠ official Uniswap on Arc.

| Stage | Status | Evidence | Blocker / next |
| --- | --- | --- | --- |
| O00 | complete | docs/evidence/o00/ | — |
| O01 | complete | docs/evidence/o01/ | Official Uniswap v4 on Arc absent |
| O02 | complete | packages/domain + docs/evidence/o02/ | — |
| O03 | complete (local) | packages/contracts + docs/evidence/o03/ | Arc deploy = O10 |
| O04 | complete (local) | mint/cancel forge tests | Arc token behavior = O10 |
| O05 | complete (local) | exercise/redeem forge tests | Independent review required |
| O06 | complete (local) | docs/evidence/o06/ | Pairband-deployed fixture only |
| O07 | complete (local) | docs/evidence/o07/ | Quotes via eth_call Quoter; not Trading API |
| O08–O32 | pending | — | O08 PositionManager next |

### Production / audit / mainnet

| Claim | Status |
| --- | --- |
| Professional security audit | **Not done** |
| Mainnet ready | **Blocked** — mainnet null; no official Uniswap Arc |
| Official Uniswap on Arc | **Absent** — Pairband-deployed testnet labeling required |

Optional O24/O25/O32: disabled.
