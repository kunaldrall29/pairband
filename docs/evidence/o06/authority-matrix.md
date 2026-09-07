# O06 authority / pause matrix (hook + launcher)

| Actor | Action | Allowed when |
| --- | --- | --- |
| MarketLauncher (owner) | `registerAndInitialize` | Owner; series vault curated by factory |
| PairbandLifecycleHook | `setMarketLauncher` | Once, before lock |
| PoolManager only | hook callbacks | Always gated by `onlyPoolManager` |
| Launcher as `initialize` sender | `beforeInitialize` | Registered key + exact `sqrtPriceX96` |
| Anyone | `beforeSwap` / `beforeAddLiquidity` | Phase == Trading (1) and `!newRiskPaused` |
| Anyone | `beforeRemoveLiquidity` | N/A — hook does not implement / does not flag |
| Factory owner | `setNewRiskPaused` | Blocks new swaps/adds via hook |

Hook never transfers vault collateral. OTC ERC-20 transfers and third-party pools are out of scope.
