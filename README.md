# Pairband

**Follow the band. Keep the keys.**

Pairband is a curator-gated Uniswap v4 range vault: LPs deposit both tokens of a pair and receive ERC-20 shares; the vault owns exactly one v4 position inside a published tick band; an agent may propose a new band; only the named curator can execute the rebalance. Swappers still trade through the public Uniswap v4 PoolManager.

> Agent proposes. Curator moves the band. You can exit.

## Monorepo

| Path | Role |
|------|------|
| `packages/contracts` | Foundry: Hook, Vault, Factory, BandMath, ShareMath |
| `packages/config` | `deployments.json`, policy defaults |
| `packages/agent` | CLI + MCP (propose only) |
| `apps/web` | Marketing + app (Next.js 15) |

## Architecture

```
LP  --deposit/withdraw-->  PairbandVault (ERC-20 shares)
                              |
                              | only vault may modifyLiquidity
                              v
                        PairbandHook  <-->  v4 PoolManager
                              ^
                              | proposeRebalance()
                        Agent (CLI or MCP)
                              |
                        curator.executeRebalance() via wallet
```

## Prize claim → file map

| Claim | Location |
|-------|----------|
| Hook gates liquidity to vault only | `packages/contracts/src/PairbandHook.sol` (`_beforeAddLiquidity` / `_beforeRemoveLiquidity`) |
| afterSwap emit-only | `PairbandHook._afterSwap` |
| Vault rebalance + fee split | `packages/contracts/src/PairbandVault.sol` (`executeRebalance`, `_splitFees`) |
| Factory create + register | `packages/contracts/src/PairbandFactory.sol` |
| Shift := \|ΔL\|+\|ΔU\| | `packages/contracts/src/libraries/BandMath.sol` |

## Contracts — quick start

```bash
cd packages/contracts
forge install
forge test --via-ir
```

### Operator key (deploy / agent — local only)

```bash
cp .env.example .env                         # gitignored
cp packages/contracts/.env.example packages/contracts/.env
# Demo key address: pnpm key:address
pnpm deploy:anvil                            # uses PRIVATE_KEY from .env
pnpm agent:whoami                            # uses PAIRBAND_AGENT_KEY
```

Keys stay in `.env` (gitignored). Never `NEXT_PUBLIC_*`, never MCP client config for user funds.

Phase 0 targets: Anvil (31337) + Unichain Sepolia (1301). No mainnet. No audit.

## License

MIT
