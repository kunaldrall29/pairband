# O10 — verification

**Status:** partial / blocked on broadcast. Reviewable dry-run + read-only Arc evidence delivered.  
**Not audited. Not Arc-lifecycle-verified. Not mainnet. Not official Uniswap.**

## Done (this environment)

| Artifact | Result |
| --- | --- |
| `script/DeployPairband.s.sol` | Dry-run default; broadcast gated by `PAIRBAND_ALLOW_BROADCAST` |
| `script/o10_arc_readonly_preflight.py` | Live Arc RPC read-only report |
| `arc-readonly-preflight.json` | chainId 5042002 OK; gas 25 Gwei ≥ 20 floor; USDC/EURC code sha match O01; Multicall3From/Permit2/CREATE2 code present |
| `forge-deploy-dry-run*.txt` | Local + Arc-RPC dry-run logs (no txs) |
| `deployment-plan.md` | Ordered deploy + POSM/WETH deferral |
| `lifecycle-checklist.md` | Steps blocked pending broadcast |
| `multicall3from-notes.md` | Sender-preservation indexing notes |

## Blocked acceptance items

- Actual contract deploy tx hashes / addresses  
- Mint → LP → buy/sell → exercise → redeem on Arc timestamps  
- Live Multicall3From → PairbandRouter payer binding proof  
- Explorer source verification  

**Do not invent hashes.** Mark `deployments/arc-testnet.json` `verified: false`.

## Commands run

```text
python3 packages/contracts/script/o10_arc_readonly_preflight.py
forge script script/DeployPairband.s.sol:DeployPairband -vvv
forge script script/DeployPairband.s.sol:DeployPairband --rpc-url https://rpc.testnet.arc.io -vvv
cast chain-id / gas-price / decimals against Arc RPC
```

## Next

Authorized operator broadcast → fill manifest → complete lifecycle checklist → then O12 service track can consume labeled testnet sources.
