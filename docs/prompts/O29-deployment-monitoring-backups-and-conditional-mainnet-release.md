
# O29 — Deployment, monitoring, backups and conditional mainnet release

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O28. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

Production deployment artifacts, infrastructure/runbooks, recovery drills and an authorization-ready release plan; actual release only when gates allow.

## Build instructions

Prepare isolated frontend/API/worker/database environments, reproducible containers/builds, configuration validation, migrations, TLS/domain routing plan, health checks and secret management. Pairband.com ownership does not authorize arbitrary DNS edits. Stage reversible web releases and preserve old claim routes. Maintain no user financial signing service.

Implement monitoring for RPC availability, quote failures/latency, indexer lag, reserve reconciliation, impending exercise-window availability and job failure. Define actionable thresholds from measurements, on-call roles and escalation runbooks. Test database backup restoration and indexer rebuild. Contract terms are immutable; rollback means UI/service compatibility or new series, not rewriting claims.

Before any mainnet plan, fetch official current chain/RPC/token/v4/periphery configuration and verify bytecode/source. Null mainnet fields cannot be replaced with testnet values. Prepare transaction batch, constructor/fee/cap/authority review, gas budget, signer method, codehash assertions and post-deploy checks. Use the independently reviewed commit and close required findings first.

Execute external deployment/publishing only within existing explicit authorization and after release gates. If unapproved or blocked, finish local/staging artifacts and list concrete pending actions. Record actual hashes/URLs only after execution. A deployment-ready claim requires reproducibility and named remaining external conditions, not a green frontend build.

## Failure cases and verification

Drill RPC failover, stale indexer, web rollback, worker outage, backup restore, expired credential and wrong-chain manifest. Confirm direct exercise/redemption survives service downtime and old series remain reachable. No secrets in images/logs/artifacts.

## Acceptance

Operations and release are reviewable and recoverable; any actual launch has verified configuration/evidence, while blocked steps remain honestly pending.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
