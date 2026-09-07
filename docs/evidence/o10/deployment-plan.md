# O10 — Arc testnet deployment plan (reviewable)

**Status:** dry-run package complete. **Broadcasts: PENDING** (no deployer authorization / no managed keystore in this environment).  
**Not audited. Not mainnet. Not official Uniswap on Arc.**

## Authorization gate

Broadcast requires **all** of:

1. Explicit operator authorization to spend Arc testnet gas/USDC from a managed deployer
2. Managed keystore / hardware / cloud KMS — **never** `--private-key` or plaintext keys in repo
3. `PAIRBAND_ALLOW_BROADCAST=1` env flag
4. `forge script … --broadcast --rpc-url https://rpc.testnet.arc.io` (keystore unlock)

Until then: mark `deployments/arc-testnet.json` contracts null and `verified: false`.

## Deploy order (Pairband-deployed test instance)

| Step | Artifact | Constructor / notes |
| --- | --- | --- |
| 1 | `PoolManager` | `new PoolManager(owner)` — **Pairband instance**, not Uniswap-official |
| 2 | `PairbandLifecycleHook` | CREATE2 with flags `(1<<13)\|(1<<11)\|(1<<7)`; args `(IPoolManager)` |
| 3 | `SeriesFactory` | `(EURC, USDC, owner)` Arc ERC-20 addresses |
| 4 | `MarketLauncher` | `(pm, hook, factory, owner)` then `hook.setMarketLauncher` |
| 5 | `PairbandRouter` | `(pm, hook)` |
| 6 | `PairbandQuoter` | `(pm, hook)` — eth_call only |
| 7 | PositionManager | **Deferred** — Arc has **no WETH**; POSM needs Pairband stub WETH + descriptor ADR |

Tokens (already on Arc): USDC `0x3600…0000` (ERC-20 6 dec), EURC `0x89B5…D72a` (6 dec). Native gas USDC is 18 dec — never mix.

## Gas / EVM

- Floor: **20 Gwei** min base fee (testnet)
- Observed `eth_gasPrice`: **25 Gwei** (O10 preflight)
- Local Foundry `evm_version=cancun`; Arc is **Osaka** — treat Anvil ≠ Arc
- `maxFeePerGas` ≥ 20 Gwei or txs stall

## Infrastructure addresses (docs.arc.io)

| Name | Address | Role |
| --- | --- | --- |
| CREATE2 (Arachnid) | `0x4e59…956C` | Hook salt deploys |
| Multicall3 | `0xcA11…CA11` | Read batching |
| Multicall3From | `0x522f…47D0` | Sender-preserving batch (CallFrom) |
| Permit2 | `0x0000…BA3` | POSM approvals when POSM lands |
| Memo | `0x5294…e505` | Memo metadata |
| Blocklist fixture | `0x7099…79C8` | Value transfer reverts (mnemonic index 1) |

## Lifecycle evidence checklist (blocked until broadcast)

After deploy, with short/pre-created series (no timestamp cheat):

1. `createSeries` → mint backed options  
2. `registerAndInitialize` + LP seed (modifyLiquidity or POSM when available)  
3. `buyExactOutput` / `sellExactInput`  
4. Wait for real `exerciseStart` → exercise  
5. Wait for `exerciseEnd` → writer redeem  
6. Post-cutoff LP decrease/collect  

Record: tx hash, block, gas used, balances before/after, events. **No invented hashes.**

## Multicall3From / indexer notes

- Indexers must attribute `msg.sender` through Multicall3From/Memo (CallFrom), not only `tx.from` of the batch contract.
- PairbandRouter binds payer to entry `msg.sender` — verify router entry via Multicall3From preserves EOA as unlock payer (live check after deploy).
- Do not put funds in public mnemonic accounts.

## Script

```bash
# Dry-run (default)
forge script script/DeployPairband.s.sol:DeployPairband -vvv

# Against Arc RPC without broadcast
forge script script/DeployPairband.s.sol:DeployPairband --rpc-url https://rpc.testnet.arc.io -vvv

# Authorized broadcast only
PAIRBAND_ALLOW_BROADCAST=1 forge script script/DeployPairband.s.sol:DeployPairband \
  --rpc-url https://rpc.testnet.arc.io --broadcast --sender <deployer>
```

Read-only preflight: `python3 script/o10_arc_readonly_preflight.py`
