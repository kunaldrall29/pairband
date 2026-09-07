# @pairband/contracts

Foundry sources for Pairband options-v2. **Not audited. Not mainnet-ready.**

## Setup

```bash
# requires foundryup / forge on PATH
forge install
forge test
```

Pinned: OpenZeppelin contracts v5.4.0, Uniswap v4-core v4.0.0 (`e50237c…`), solc 0.8.26 (`via_ir`).

Official Uniswap v4 is not listed on Arc; hook/router stages must label any self-deployed periphery as **Pairband-deployed testnet instances**. Local `PoolManager` in tests is a fixture, not an official deployment.

O06: `PairbandLifecycleHook` + `MarketLauncher` + `HookMiner`. App Kit is not used to swap option tokens.
