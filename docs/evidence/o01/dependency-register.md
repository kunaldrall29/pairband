# O01 — Dependency / source register

Checked 2026-09-07. Read-only preflight.

## Arc Testnet

| Item | Value | Provenance | Status |
| --- | --- | --- | --- |
| chainId | 5042002 | RPC eth_chainId + docs.arc.io connect-to-arc | verified |
| RPC | https://rpc.testnet.arc.io | Arc connection docs (preferred) | verified |
| Alternate RPC | https://rpc.testnet.arc.network | Legacy skill example; also responds | noted discrepancy |
| Explorer | https://testnet.arcscan.app | Arc docs | documented |
| ERC-20 USDC | 0x3600…0000 decimals 6 | eth_getCode + decimals() | verified |
| EURC | 0x89B5…D72a decimals 6 | eth_getCode + decimals() | verified |
| Native USDC | 18 decimals gas | Arc docs | documented (do not add to ERC-20) |
| Mainnet | null | intentional | unverified |

Evidence: `docs/evidence/o01/arc-rpc-preflight.json`

## Uniswap v4

| Item | Status |
| --- | --- |
| Official Arc PoolManager / periphery | **Not listed** on Uniswap v4 deployments page (2026-09-07) |
| Permit2 at 0x0000…BA3 on Arc testnet | Bytecode present; not proof of official v4 stack |
| Path forward | Pin upstream v4-core/periphery commits; deploy labeled **Pairband-deployed testnet instance** after license review (O06/O10) |
| Mainnet | null until official Arc support or separately reviewed plan |

## Toolchain

| Tool | Version | Notes |
| --- | --- | --- |
| Foundry forge | 1.8.1 (982849d) | Installed for O03+ |
| solc target | 0.8.26 | foundry.toml; Arc EVM nuances still need Arc RPC tests |
| Node | 22.x | LTS |

## Optional integrations (disabled)

| Integration | Decision |
| --- | --- |
| Circle App Kit funding | Disabled until credentials + destination support verified (O24) |
| Circle Wallets | Disabled |
| The Graph | Disabled — no live Arc qualifying endpoint claimed (O25) |
| Uniswap Trading API | Disabled — option tokens unsupported assumption |
| Email | Disabled provider |

## Licenses (preliminary)

- Pairband repo: Apache-2.0
- OpenZeppelin / Uniswap upstream: pin and record SPDX at install time in O03/O06; do not copy another chain's addresses
