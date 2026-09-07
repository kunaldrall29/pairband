# O07 — Narrow router evidence

**Status:** complete (local Anvil / pinned v4-core). **Not audited. Not Arc-deployed. Not official Uniswap.**

## Artifacts

- `packages/contracts/src/PairbandRouter.sol` — `buyExactOutput` / `sellExactInput`; stored unlock context (payer = entry `msg.sender`); rejects `msg.value`; full-fill + slippage checks
- `packages/contracts/src/PairbandQuoter.sol` — eth_call simulation via `QuoteResult` revert
- `packages/sdk` — encode buy/sell builders, quote decode, USDC-per-option premium helper (not FX spot)

## Verification

```text
forge test   # 29 passed (vault + hook + router)
pnpm --filter @pairband/sdk test  # 5 passed
```

See `forge-test-output.txt`.

## Honesty

- Uses Pairband-deployed local `PoolManager` fixture from O06 — **not** official Uniswap on Arc
- No Universal Router / Trading API path
- Quote is not a fill guarantee; resimulate before signing
- Vault `accountedUSDC6` unchanged across buys (router does not move collateral)
