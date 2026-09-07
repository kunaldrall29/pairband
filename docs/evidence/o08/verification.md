# O08 — LP / PositionManager verification

**Status:** complete (local). **Not audited. Not Arc-deployed. Not official Uniswap.**

## Done

- Pinned v4-core `59d3ecf5…` + v4-periphery `dce236d4…` (Pairband-deployed fixtures)
- `OptionTickMath` — USDC-per-whole-option ↔ sqrtPrice/ticks (both sort orders)
- `MakerLpLifecycle` — writer receipt independent of LP; trade; post-cutoff remove via `PoolModifyLiquidityTest`
- **`PositionManagerE2E`** — real periphery POSM + Permit2 + Action planner:
  - mint NFT liquidity (`MINT_POSITION` + `CLOSE_CURRENCY`)
  - trade via `PairbandRouter` (vault USDC unchanged)
  - collect fees (decrease 0)
  - post-cutoff: increase reverts (hook `TradingDisabled` wrapped); full decrease succeeds
  - unauthorized NFT management reverts (`NotApproved`)
- SDK typed POSM planners: `buildMintPositionPlan` / `buildDecreaseLiquidityPlan` / `buildCollectFeesPlan`

## Honesty

- PoolManager + PositionManager in tests are **Pairband-deployed Anvil fixtures**, not official Uniswap on Arc.
- Local Anvil ≠ Arc (Osaka, blocklist, Multicall3From) — deferred to O10.
- Green forge/sdk tests are **not** an audit.

## Verification

```text
forge test  # 34 passed (includes PositionManagerE2ETest)
pnpm --filter @pairband/sdk test
```

See `forge-test-output.txt`.
