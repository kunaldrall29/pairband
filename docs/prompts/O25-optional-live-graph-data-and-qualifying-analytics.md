
# O25 — Optional live Graph data and qualifying analytics

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O01, O12. Verify recorded evidence, not just a completed checkbox. Optional; enable only when the stated support/product gate is satisfied.

## Required outputs

A supported deployed live-data integration with meaningful analytics, or a documented disabled status with no prize claim.

## Build instructions

Verify a real Graph provider's Arc/network support, endpoint availability, source-contract indexing and access requirements. A local graph-node, fixture JSON or static endpoint is not qualifying live provider evidence. Do not copy another chain's subgraph identifier. If no supported route exists, stop this optional feature and keep O12 RPC indexing operational.

Define actual product value: independently query series issuance/exercise/claims, compare market quote depth against events, or expose standardized, well-documented options lifecycle data to integrators. If extending an existing accepted standardized schema, name the exact schema/version and explain compatible additions. A custom schema cannot be called standardized merely because fields have similar names.

For a composition claim, verify that the combination satisfies current event rules; two subgraphs are not automatically two distinct Graph products. Build a substantial live feature with reusable schema/query examples, provider provenance, indexed block/freshness and user-facing consequences. No decorative query result dump or unused AI label.

Compare results against RPC state at aligned blocks. The Graph may serve analytics/portfolio convenience but does not authorize exercise or redemption. Keep credentials server-side, bound query cost, handle rate limits and show unavailable/stale states. Update submission evidence only after the actual deployed endpoint works.

## Failure cases and verification

Test provider outage, wrong chain/schema, lag, duplicate entity IDs, changing event ABI, rate limits and disagreement with canonical state. Demonstrate meaningful use of actual live provider data, not a mocked integration test.

## Acceptance

The Graph is load-bearing for its claimed analytics feature and accurately documented, while settlement remains independent; otherwise the feature and prize claim stay disabled.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
