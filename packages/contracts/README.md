# @pairband/contracts

Foundry workspace for Pairband (Uniswap v4 curated range vault).

## Setup

```bash
cd packages/contracts
forge install
forge test --via-ir
```

Dependencies (via `forge install` / existing `lib/`):

- `v4-core`, `v4-periphery`
- `uniswap-hooks` (OpenZeppelin BaseHook)
- `openzeppelin-contracts`
- `forge-std`, `solmate`

## Layout

```
src/
  PairbandHook.sol      # vault-gated liquidity + afterSwap telemetry
  PairbandVault.sol     # ERC-20 shares, propose/execute rebalance, fee split
  PairbandFactory.sol   # create vault, register hook, initialize pool
  libraries/
    BandMath.sol        # align / width / shift (|ΔL|+|ΔU|)
    ShareMath.sol       # share mint/burn rounding
    LiquidityAmounts.sol
test/
  BandMath.t.sol
  PairbandHook.t.sol
  PairbandVault.t.sol   # 13 acceptance cases
```

## Phase 0

Anvil (31337) + Unichain Sepolia (1301). Addresses live in `packages/config/deployments.json`.
