# O08 — LP / PositionManager progress

**Status:** partial (local). **Not audited. Not Arc-deployed. Not official Uniswap.**

## Done

- Upgraded pinned v4-core to `59d3ecf5…` (required for current periphery `PoolOperation` types)
- Pinned v4-periphery `dce236d4…` under `packages/contracts/lib/v4-periphery`
- `OptionTickMath` — USDC-per-whole-option ↔ sqrtPrice/ticks (both sort orders)
- `MakerLpLifecycle` tests — writer receipt independent of LP inventory; trade against maker; remove liquidity after trading cutoff; vault USDC unchanged
- Remappings for periphery + permit2

## Still open (honest)

- Full **PositionManager NFT** mint/increase/decrease/collect Action planner path against Pairband hook is **not yet E2E wired** in Pairband tests (Permit2 + descriptor + planner helpers remain). Local LP uses `PoolModifyLiquidityTest` as Anvil stand-in.
- Any Arc deploy remains a **Pairband-deployed testnet instance**.

## Verification

```text
forge test  # 32 passed
```

See `forge-test-output.txt`.
