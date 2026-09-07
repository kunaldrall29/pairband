
# O12 — Canonical RPC indexer and reserve reconciliation

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O05, O06, O08, O11. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

Replayable chain indexer, event projections, portfolio balances, LP ownership and independent reserve checks.

## Build instructions

Decode generated Pairband and pinned Uniswap ABIs. Ingest bounded ordered block ranges with block/hash checkpoints, exact event deduplication and transactional projection updates. Register series/pool identity only from verified manifest/factory events. Treat timestamps as non-decreasing; order by block/log positions. Handle provider inconsistency and testnet reset through explicit reconciliation rather than mixing deployments.

Maintain long and receipt balances from transfers, collateral state from protocol actions and LP positions from verified PositionManager events/read calls. A PoolManager event caller may be the router, not a human owner; use RouterTrade evidence for attribution and mark unknown external routes honestly. Do not create financial actions merely because the same USDC movement appears in two emitters.

Implement direct RPC reconciliation of accountedUSDC/EURC, token supplies, writer snapshots and NFT ownership. Separate actual donations from accounted assets. Persist as-of block/hash and indexer lag, expose safe read models and retain a backfill/rebuild command. Do not require Graph for settlement-critical data.

Store submitted transaction monitoring separately from confirmed event facts. Follow replacements and distinguish missing/reverted/confirmed outcomes without automatic rebroadcast. Make reads usable against local fixtures and, when available, the actual O10 testnet deployment with distinct source labels.

## Failure cases and verification

Test duplicate logs, interrupted batches, restart checkpoints, repeated timestamps, wrong ABI/emitter, missing blocks, RPC disagreement, testnet reset and replay equivalence. After partial exercise, compare both reserve assets and writer claims to the contract.

## Acceptance

A full replay produces the same projections as incremental indexing; critical amounts reconcile with chain state; delayed data is visibly stale rather than falsely current.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
