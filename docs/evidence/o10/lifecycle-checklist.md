# O10 — Lifecycle evidence checklist

**All items PENDING** until authorized Arc broadcast + real window timing.

| # | Action | Tx hash | Block | Gas | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Deploy PoolManager | — | — | — | Pairband-deployed label |
| 2 | Deploy hook (CREATE2) | — | — | — | Verify flags bits |
| 3 | Deploy factory/launcher/router/quoter | — | — | — | |
| 4 | createSeries (short window) | — | — | — | No Anvil warp |
| 5 | mint | — | — | — | accountedUSDC before/after |
| 6 | registerAndInitialize + LP seed | — | — | — | POSM deferred if no WETH stub |
| 7 | buyExactOutput | — | — | — | |
| 8 | sellExactInput (optional) | — | — | — | |
| 9 | exercise (after real exerciseStart) | — | — | — | |
| 10 | redeem (after real exerciseEnd) | — | — | — | |
| 11 | LP decrease post-cutoff | — | — | — | |
| 12 | Multicall3From → router smoke | — | — | — | Sender preservation |

Illustrative FX slides remain separate from on-chain prices.
