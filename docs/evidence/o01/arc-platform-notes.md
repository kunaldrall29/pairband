# Arc platform notes (O01 reconcile — 2026-09-07)

Fetched from [docs.arc.io](https://docs.arc.io) (connect-to-arc, contract-addresses, evm-differences, gas-and-fees, usdc-system-events) and cross-checked against Circle `use-arc` skill examples. Prefer live docs over skill snippets when they diverge.

## RPC / chain

| Item | Canonical (docs.arc.io) | Skill / legacy | Pairband choice |
| --- | --- | --- | --- |
| HTTP RPC | `https://rpc.testnet.arc.io` | `https://rpc.testnet.arc.network` | **Prefer `.arc.io`** (O01 preflight) |
| Chain ID | `5042002` | same | verified |
| Explorer | `https://testnet.arcscan.app` | same | documented |
| Mainnet | not available | — | **null** |

Both `.arc.io` and `.arc.network` answered `eth_chainId=0x4cef52` during this reconcile. Still label `.arc.io` as preferred per official connect page. Alternate providers (Blockdaemon, dRPC, QuickNode) listed on connect-to-arc.

## EVM / fee model (testnet)

| Topic | Fact | Impact on Pairband |
| --- | --- | --- |
| Baseline | Osaka EVM (+ select Amsterdam features, notably EIP-7708) | Local Anvil ≠ Arc; Arc-specific suite is O10 |
| Native gas | USDC, **18 decimals** | Never mix with ERC-20 USDC amounts |
| ERC-20 USDC | `0x3600…0000`, **6 decimals** | Settlement token for vaults/pools |
| EURC | `0x89B5…D72a`, 6 decimals | Underlying for puts |
| Fee floor | **min base fee 20 Gwei** (testnet) | `maxFeePerGas` ≥ 20 Gwei or txs stall |
| Observed `eth_gasPrice` | `0x5d21dba00` (25 Gwei) at reconcile | Above floor; do not hardcode as mainnet |
| System emitter | `0xfff…ffe` EIP-7708 `Transfer` (18 decimals) | Indexers must dedupe vs ERC-20 Transfer |
| Blocklist | Native value to/from blocklisted addr reverts | Test vector `0x7099…79C8` (mnemonic index 1) |
| `address(0)` native send | Non-zero value to zero address reverts | No native/self-USDC PoolKeys |
| CREATE2 factory | Arachnid `0x4e59…956C` on testnet | Available for hook salt deploys |

## Uniswap / App Kit honesty

- Official Uniswap v4 **not listed** for Arc → Pairband-deployed testnet instances only (see `uniswap-arc-decision.md`).
- Circle App Kit (bridge/swap/send/unified balance) is **optional**; Swap supported assets are USDC/EURC/cirBTC-class — **not** Pairband option tokens. Do not enable as core path (O24 gated).

## MCP / skills

- Arc Docs MCP: `https://docs.arc.io/mcp` (no auth) — project config `.cursor/mcp.json`.
- Circle AI skills (`use-arc`, App Kit, wallets) are documentation aids; they do not authorize funding/wallet product enablement.
