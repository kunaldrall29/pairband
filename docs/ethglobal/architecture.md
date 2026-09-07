# Architecture (ETHGlobal stub)

**Draft diagram for docs — not a prize claim.** Distinguish official Arc/Uniswap listings from Pairband-deployed fixtures.

```text
 Users (EOA)
    │
    ├─ USDC/EURC approvals ──► SeriesVault (mint/cancel/exercise/redeem)
    │                              ▲
    │                              │ series view / phase
    │                              │
    ├─ buy/sell ──► PairbandRouter ──► PoolManager ◄── PairbandLifecycleHook
    │                    │               (Pairband-deployed     (CREATE2 flags:
    │                    │                on Arc if/when          init/swap/add)
    │                    │                authorized)                  ▲
    │                    └─ PairbandQuoter (eth_call only)             │
    │                                                                  │
    └─ LP ──► PositionManager (local E2E) / modifyLiquidity ───────────┘
              Arc POSM deferred (no WETH on Arc)

 SeriesFactory (Ownable: createSeries, newRiskPaused)
 MarketLauncher (Ownable: registerAndInitialize)

 Parallel app track (api-ui): API quotes/prepare + /protect UI
   → fixture quotes labeled executable:false until verified manifest
```

## Why the hook matters (without overclaiming)

- Ensures only **registered** series pools initialize at the frozen sqrt price.  
- Enforces **trading phase** and **new-risk pause** on swap and add-liquidity.  
- Does **not** move vault collateral, set premiums, or ensure fills.  
- Remove-liquidity remains available after trading cutoff so makers are not trapped.

## Official vs Pairband

| Component | Status |
| --- | --- |
| Arc USDC / EURC / Permit2 / Multicall3From | Official Arc testnet addresses (see O01/O10) |
| Uniswap v4 PoolManager / POSM on Arc | **Not officially listed** — self-deploy = Pairband-deployed label |
| PairbandRouter / Hook / Vault | Pairband code; Apache-2.0 |

Full review map: `docs/review/architecture-map.md`.
