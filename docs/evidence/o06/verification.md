# O06 — Uniswap v4 lifecycle hook evidence

**Status:** complete (local Anvil / pinned v4-core). **Not audited. Not Arc-deployed. Not official Uniswap.**

## Pins

| Dependency | Tag / rev |
| --- | --- |
| Uniswap v4-core | `v4.0.0` / `e50237c43811bd9b526eff40f26772152a42daba` |
| solc | 0.8.26, `via_ir=true`, evm `cancun` |

## Artifacts

- `packages/contracts/src/hooks/PairbandLifecycleHook.sol` — `beforeInitialize`, `beforeSwap`, `beforeAddLiquidity` only; CREATE2 permission bits `(1<<13)|(1<<11)|(1<<7)`.
- `packages/contracts/src/MarketLauncher.sol` — designated register+initialize at frozen sqrt price.
- `packages/contracts/src/libraries/HookMiner.sol` — CREATE2 salt miner.
- Tests: `packages/contracts/test/PairbandLifecycleHook.t.sol` (uses real `PoolManager` + core test routers).

## Verification

```text
forge test
# 16 passed (6 SeriesLifecycle + 10 PairbandLifecycleHook)
```

See `forge-test-output.txt`.

Covered: permission mask + CREATE2 address, trading add/swap, remove after cutoff, pause, scheduled/matured boundaries, wrong price, duplicate series, unauthorized callback, vault USDC unchanged across swap.

## Honest labels

- Local PoolManager is a **Pairband-deployed test fixture**, not an official Uniswap Arc deployment (official Arc listing still absent — O01).
- Atomic periphery **seed** beyond initialize is deferred to O08 (PositionManager); launcher initializes at fixed price only.
- Arc Osaka / sender-preserving Multicall3From / blocklist behavior still requires O10 Arc RPC suite.
- Circle App Kit does **not** swap Pairband option tokens.
