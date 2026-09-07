# Pairband options-v2 — ETHGlobal README (DRAFT STUB)

**Status: draft for operators. Not a contest submission. Not published as the official hackathon README.**  
Form completion, public push, and video upload are **separate authorized actions** — none are claimed here.

## One-liner

Dated EURC put options on Arc: writers lock USDC backing; buyers trade option tokens against USDC on a **Pairband-deployed** Uniswap v4 test instance; physical exercise and writer redemption complete the lifecycle.

## Honesty labels (required in any public copy)

| Label | Fact |
| --- | --- |
| Audit | **Not audited** — O28 is prep docs only |
| Uniswap on Arc | Official v4 **not listed** — PoolManager must be labeled Pairband-deployed |
| Arc deploy | `deployments/arc-testnet.json` → `verified: false`; contracts null until broadcast |
| Local ≠ Arc | Foundry `cancun` ≠ Arc Osaka |
| Quotes / UI | Fixture/preview paths use `executable: false` (api-ui O13/O18) |
| Prizes / tracks | **No prize or track selection claimed** |

## Product story (what exists)

1. **Writer** mints: locks `q × strike` USDC; receives long + writer receipt.  
2. **Maker** supplies separate free USDC/longs to a v4 pool (POSM locally; Arc POSM deferred — no WETH).  
3. **Buyer** `buyExactOutput` via `PairbandRouter` (full fill or revert).  
4. After `exerciseStart`: swaps/adds blocked; LP decrease/collect still allowed.  
5. **Exercise**: burn longs, deliver EURC, receive USDC.  
6. After `exerciseEnd`: writer **redeem** mixed reserves.

Hook lifecycle gates registration/phase/pause — it does **not** guarantee price, depth, or distribution.

## Dual-track code

| Track | Branch (examples) | What judges should look at |
| --- | --- | --- |
| Protocol | `cursor/options-v2-bootstrap-4c19` | Contracts O00–O09, O10 dry-run, O28 review docs |
| App | `cursor/api-ui-foundations-4c19` | API/UI O11–O18 (fixture quotes / protect flow) |

Merge state may lag; cite evidence paths, not aspirational completeness.

## Setup (local reproduce)

```bash
# Node workspace
pnpm install
pnpm --filter @pairband/domain test
pnpm --filter @pairband/sdk test   # if present on tip

# Contracts (protocol tip)
cd packages/contracts
forge test
# Optional dry-run deploy script (no broadcast):
forge script script/DeployPairband.s.sol:DeployPairband -vvv
```

Copy `.env.example` → `.env`. Keep `PAIRBAND_MODE=preview` and `PAIRBAND_ALLOW_BROADCAST=0` unless an operator explicitly authorizes otherwise.

Pinned toolchain (protocol): solc **0.8.26**, via_ir, optimizer 200; v4-core `59d3ecf5…`, v4-periphery `dce236d4…`.

## Architecture

See [architecture.md](./architecture.md) and `docs/review/architecture-map.md`.

## Demo / video

See [demo-checklist.md](./demo-checklist.md). Prefer **local forge** or labeled fixtures until Arc receipts exist. No fabricated FX crash or invented tx hashes.

## Contract paths (protocol tip)

- `packages/contracts/src/SeriesVault.sol`  
- `packages/contracts/src/SeriesFactory.sol`  
- `packages/contracts/src/hooks/PairbandLifecycleHook.sol`  
- `packages/contracts/src/MarketLauncher.sol`  
- `packages/contracts/src/PairbandRouter.sol`  
- `packages/contracts/src/PairbandQuoter.sol`  

## Recovery / failures

- Preview/unverified manifest → financial prepare blocked.  
- Stale deadline / partial fill → router reverts.  
- New-risk pause → mint/swap/add blocked; cancel/exercise/redeem/LP exit remain.  
- Failed broadcast → do not retry economic actions blindly; reconcile receipts (O10 notes).

## AI assistance disclosure

Built with AI coding agents; humans own review, submission accuracy, and any public claims.

## Known limitations

`docs/review/known-limitations.md`.

## Uniswap feedback

Draft: [FEEDBACK.stub.md](./FEEDBACK.stub.md) — **not submitted**.

## Evidence map

[evidence-map.md](./evidence-map.md).
