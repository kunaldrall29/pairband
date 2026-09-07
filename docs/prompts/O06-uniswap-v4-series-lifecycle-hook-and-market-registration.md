
# O06 — Uniswap v4 series lifecycle hook and market registration

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O01, O03, O05. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

Lifecycle hook, pool registration/launch logic, CREATE2 tooling and tests using real pinned v4 core.

## Build instructions

Build PairbandLifecycleHook with only the required callbacks: beforeInitialize, beforeSwap and beforeAddLiquidity. Authenticate PoolManager, validate exact registered PoolKey/series, and derive lifecycle from immutable terms. Enable swaps/additions only in Trading with new risk enabled. Do not add beforeRemoveLiquidity restrictions or custom return deltas. The vault retains all collateral/exercise responsibilities.

Freeze ordered currencies (long token and ERC20USDC), fee, tick spacing, hook and series relationship. Reject writer-receipt markets, native-USDC/self-USDC pairs and unregistered parameters. Define a designated market launcher and fixed initialization price so creation cannot be front-run at arbitrary price. Prepare atomic initialize+seed through compatible periphery during the permitted phase. Do not confuse a future official Uniswap deployment with your test instance.

Mine CREATE2 salts whose address bits exactly match permissions. Assert constructor manager, final address, runtime code and permission mask. Pin upstream hook interfaces rather than inventing signatures. Add contract/source evidence for all authority and pause paths. A hook attached to one registered pool cannot prohibit OTC transfers or third-party pools; do not enforce token freezing to imply otherwise.

Use real v4 core tests, not a mock that omits callback dispatch. Verify Arc-specific sender-preserving extensions in the later Arc suite before relying on standard-EVM callback assumptions.

## Failure cases and verification

Test wrong manager, invalid address flags, unsupported key, unauthorized/incorrect initialization, duplicate pool, pause and both expiry boundaries. Demonstrate LP decrease/fee collection still succeeds after trading cutoff, and no hook call moves vault backing.

## Acceptance

A registered pool exhibits the intended lifecycle with real core callbacks and recoverable LP exits; permission bits and launch behavior are reproducible.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
