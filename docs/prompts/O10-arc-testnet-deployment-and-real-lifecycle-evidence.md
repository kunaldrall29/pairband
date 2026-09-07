
# O10 — Arc testnet deployment and real lifecycle evidence

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O09. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

Reviewable deployment plan/scripts, verified testnet manifest and, when authorized, actual lifecycle receipts and runtime checks.

## Build instructions

Reverify current Arc configuration, gas floor, token code/decimals and v4 dependencies from O01. Prepare deployment transactions, signer profile, gas estimates, constructors, codehash expectations, CREATE2 salt and license/provenance notes. Mainnet values remain null. Use encrypted/hardware/managed signer tooling, not plaintext production keys or CLI key flags. Only broadcast within applicable existing authorization; otherwise finish dry-run artifacts and mark broadcasts pending without marking testnet verification complete.

Deploy nonupgradeable factory/registry/vault/token/hook/router/launcher components and compatible testnet periphery only where required and permitted. Verify source and runtime; distinguish official dependencies from Pairband test instances. Populate manifest with actual transaction hashes, block numbers, addresses, compiler/EVM settings, dependency commits and codehashes.

Use real testnet USDC/EURC and short or pre-created series to perform mint, pool seed, buy, sale where possible, exercise, maturity redemption and LP withdrawal. No public-chain timestamp manipulation. Keep illustrative FX scenarios separate from actual token prices. Record balances, protocol events and gas costs for each action.

Test Arc-specific native/ERC20 balance semantics, dual emitter indexing assumptions, current blocklist failure handling and relevant caller-preserving behavior using controlled test fixtures. Never put real assets into public known test accounts. Reconcile missing receipts rather than retrying economic actions blindly.

## Failure cases and verification

Check chain/address/code mismatch, failed broadcast, unknown receipt, gas reserve, explorer verification mismatch and elapsed window during wallet approval. Compare vault accounting before/after actual exercises and redemptions.

## Acceptance

Mark this stage verified only with genuine testnet lifecycle evidence. If broadcasts are unexecuted, deliver the complete reviewable package and mark those acceptance items blocked; no invented hashes or mainnet-ready claims.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
