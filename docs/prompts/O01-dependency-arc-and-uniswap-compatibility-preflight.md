
# O01 — Dependency, Arc and Uniswap compatibility preflight

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O00. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

Pinned dependency/source register, machine-readable integration status, testnet address/codehash report, license review notes and a supported integration decision.

## Build instructions

Read the installed Circle use-arc and Uniswap swap-integration skills when available, then current canonical Arc EVM differences, gas, addresses, connection and USDC event references. Resolve discrepancies explicitly; the older skill RPC example must not outrank current network evidence. Query chainId and code/decimals using read-only RPC. Record provider, date and block for checks. Distinguish native USDC 18 from ERC20 6 without adding balances.

Inspect actual Uniswap v4 core/periphery/PositionManager/Quoter/StateView/Permit2 source and deployment records. Pin compatible commits, package versions, compiler and EVM target; do not select Osaka blindly if the toolchain cannot compile/test it. Verify callback interface, signed swap conventions, NFT liquidity API and allowance path. Prove that a six-decimal long token is representable in SDK quote/price math. Capture unresolved chain support as a blocker.

If an official Arc contract is absent, prepare a plan for a clearly labeled pinned testnet deployment, including license conditions and tests. Do not transplant another chain's address or describe a self-deployed instance as official. Mainnet fields remain null. Record whether Arc-native precompiles require real-network tests beyond Anvil.

For Circle funding and The Graph, inspect actual chain/token/provider support and credentials requirements. Mark optional unsupported integrations disabled. Trading API swap support for new Pairband options is not assumed. Do not reinstall an already available skill or request keys for integrations that are not needed.

## Failure cases and verification

Check wrong chain, empty bytecode, unexpected decimals, unsupported SDK method, missing deployment and license uncertainty. Failed network lookup is not proof a deployment does not exist; mark unverified. No gas-spending action belongs in this read-only preflight.

## Acceptance

The required dependency path is evidenced or concretely blocked, and every address/version in generated config has provenance instead of a guess.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
