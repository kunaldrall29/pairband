# Readiness ledger (Gate0–Gate5)

Status vocabulary per `docs/reference/release-gates.md`.  
**Absent external review stays pending — never quietly complete.**

Frozen reference tip: `fe6fb0f` (O10 dry-run on bootstrap). Update commit column when re-freezing.

| Gate | Owner (suggested) | Status | Evidence | Commit | Environment | As-of |
| --- | --- | --- | --- | --- | --- | --- |
| Gate0 dependency path | Protocol eng | **partial** | O01 preflight; O10 readonly; Uniswap Arc **not listed** | fe6fb0f | Arc RPC read-only + local | 2026-09-07 |
| Gate1 local product | Protocol eng | **tested-locally** (core contracts) | O02–O09 forge/domain; UI/API parallel incomplete on this branch | fe6fb0f | Anvil / local | 2026-09-07 |
| Gate2 Arc testnet slice | Deployer ops | **blocked** | O10 dry-run only; **broadcast pending** | fe6fb0f | Arc testnet | 2026-09-07 |
| Gate3 economic/customer | Founder | **pending** | O26/O27 not executed | — | — | 2026-09-07 |
| Gate4 funded pilot | Founder + reviewer + counsel | **blocked** | This O28 prep only; **no audit**; legal pending | o28 branch | docs | 2026-09-07 |
| Gate5 mainnet | — | **blocked** | Mainnet null; official Uniswap Arc absent | — | — | 2026-09-07 |

## Separated workstreams

| Stream | Status | Notes |
| --- | --- | --- |
| Security findings (internal) | Triaged locally | Slither + O09; needs external review |
| Independent audit | **Pending** | Do not badge |
| Legal review | **Pending** | Facts memo drafted only |
| Deployment support | Dry-run ready | Broadcast unauthorized |
| Commercial / maker readiness | **Pending** | O27 |
| ETHGlobal submission | **Not submitted** | See `docs/ethglobal/*` stubs |

## Real-fund enabling flags

| Flag / control | Safe default | Evidence |
| --- | --- | --- |
| `PAIRBAND_MODE=preview` | Blocks financial txs in SDK helper | sdk tests |
| Manifest `verified` | false on Arc deploy file | `deployments/arc-testnet.json` |
| `PAIRBAND_ALLOW_BROADCAST` | 0 / unset | `.env.example`, DeployPairband |
| Mainnet chainId | null | manifests |
| Optional Circle funding/wallets | disabled | integrations.json |
