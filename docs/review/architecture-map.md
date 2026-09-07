# Architecture map

```text
                    ┌─────────────────────────────────────────┐
                    │           Users / Makers (EOA)          │
                    └───────────┬─────────────┬───────────────┘
                                │             │
                    USDC/EURC   │             │ option / USDC
                    approvals   │             │ via PairbandRouter
                                ▼             ▼
┌──────────────┐   create    ┌──────────────────┐   register    ┌────────────────────┐
│ SeriesFactory│────────────▶│   SeriesVault    │◀──────────────│  MarketLauncher    │
│ (Ownable     │             │ long + receipt   │               │  (onlyOwner init)  │
│  newRiskPause)│            │ accounted USDC/  │               └─────────┬──────────┘
└──────────────┘             │ EURC; mint/cancel│                         │
                             │ exercise/redeem  │                         │
                             └────────┬─────────┘                         │
                                      │ series view                       │
                                      ▼                                   ▼
                             ┌──────────────────┐              ┌────────────────────┐
                             │PairbandLifecycle │◀─────────────│ PoolManager        │
                             │Hook (CREATE2     │  callbacks   │ (Pairband-deployed │
                             │ flags)           │              │  test instance)    │
                             └────────┬─────────┘              └─────────┬──────────┘
                                      │                                  │
                             ┌────────┴────────┐              ┌──────────┴─────────┐
                             │ PairbandRouter  │              │ LP via POSM (local)│
                             │ buyExactOutput  │              │ or modifyLiquidity │
                             │ sellExactInput  │              │ (Arc POSM deferred)│
                             └─────────────────┘              └────────────────────┘
                             ┌─────────────────┐
                             │ PairbandQuoter  │  eth_call only (revert QuoteResult)
                             └─────────────────┘
```

## Trust boundaries

| Boundary | Inside | Outside |
| --- | --- | --- |
| Vault accounting | `accountedUSDC6` / `accountedEURC6` | Raw ERC-20 donations, pool inventory, fee recipient |
| Hook | Phase + pause gates on init/swap/add | Remove liquidity, transfers, OTC |
| Router | Single registered pool; payer = `msg.sender` | Universal Router / Trading API |
| Factory owner | `setNewRiskPaused`, `createSeries` | Cannot seize vault reserves or rewrite terms |
| Arc infra | USDC/EURC/Permit2/Multicall3From predeploys | Official Uniswap v4 on Arc (**absent**) |

## Apps (parallel / partial)

Preview web/api/worker scaffolds exist; service indexer (O12) may prep against fixtures. Do not treat preview UI as Arc-verified trading.
