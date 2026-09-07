
# O23 — Activity, exports and financial observability

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O12, O16, O21. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

Human-readable activity ledger, transaction recovery view, CSV export and accurate product metrics.

## Build instructions

Implement activity from confirmed protocol/router/periphery events, linking each row to series, chain, block and actual transaction. Label mint, sale, buy, cancel, exercise, writer redemption, LP add/decrease/collect and issuance fee distinctly. Submitted/replaced/unknown transactions belong to monitoring states, not the settled ledger.

Show actual asset deltas and gas where evidence exists. Avoid dual USDC emitter duplication. For router paths without supported attribution, mark owner unknown rather than infer it from PoolManager sender. Imported receipt/LP holdings have unknown cost basis unless verified.

Export bounded paginatedCSV with currency units, UTC timestamps, chain/testnet label, event identity and provenance. Escape spreadsheet formula-leading text, exclude private email/session data and avoid presenting a tax calculation as authoritative. Provide raw receipt links and recovery suggestions for missing/unknown transactions without an automatic retry button that spends again.

Add operational/product dashboards for open writer units, exercised units, accounted reserves, remaining claims, quote availability, executed premium volume and protocol fees. Keep option notional, collateral and LP liquidity separate. Metrics based on fixtures must remain visibly illustrative. Do not add badges for investor traction from testnet data.

## Failure cases and verification

Test duplicate events, replacement hashes, unknown outcomes,CSV injection, timezone rendering, stale indexer, externally transferred claims and privacy exclusion. Reconcile aggregate events with vault counters and actual fee recipient balances where attributable.

## Acceptance

Users and operators can audit the complete lifecycle from real evidence, and exports/metrics do not double count or invent income.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
