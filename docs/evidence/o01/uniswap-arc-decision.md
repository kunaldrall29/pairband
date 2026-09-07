# Uniswap v4 on Arc — integration decision (O01)

**Decision:** Official Uniswap v4 core/periphery are **not** listed for Arc as of 2026-09-07. Pairband will:

1. Pin compatible upstream `@uniswap/v4-core` / `v4-periphery` git commits for local Anvil tests.
2. Prepare a **Pairband-deployed testnet instance** plan for Arc testnet (O06/O10), labeled honestly — never as official Uniswap.
3. Keep all mainnet Uniswap fields `null` until official deployments or a separately reviewed deployment plan exists.
4. Use a narrow PairbandRouter; do not assume Universal Router / Trading API support for option tokens.

**Gate0 impact:** Dependency path is **conditionally viable** via self-deployed pinned contracts on testnet. Mainnet Gate5 remains blocked on official/verified periphery.
