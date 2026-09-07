
# O32 — Optional future-product expansion design

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O28, O31. Verify recorded evidence, not just a completed checkbox. Optional; enable only when the stated support/product gate is satisfied.

## Required outputs

Separate ADRs/specifications for selected future capabilities, with no silent changes to issued v1 terms.

## Build instructions

Choose a future capability only from an explicit product priority: EURC-covered calls, a newly supported currency, user-controlled exercise automation, professional maker tooling, covered strategy vaults or distributionSDK. Do not implement all simultaneously because they appear on a roadmap.

For each selected capability define user job, new asset/claim accounting, capital source, payout, fees, lifecycle, admin permissions, threat model, regulatory/customer assumptions, integration support and migration. Covered calls change which asset backs the obligation; a new currency changes token/issuer/precision risks. Reuse v1 code only where the economic proof still applies.

Automation must specify delegated authority, spend limits, expiration, revocation, keeper failure, gas funding and behavior during feed/network outages. Public pooled strategy vaults require independent share/valuation/withdrawal/expiry accounting and fresh review; they cannot be added by relabeling writer receipts. Maker tooling controls its own inventory and does not borrow collateral.

Leave existing series immutable and recovery-compatible. Prepare separate prototypes/tests behind disabled flags and independently review them before funding. Borrowing, leveraged perps, oracle cash settlement, RWA reserve lending and privacy are new protocol designs, not routine toggles.

## Failure cases and verification

For each proposal compare changed assumptions against v1 invariants and identify what becomes invalid. Reject scope that relies on unverified token/provider support or reuses already pledged collateral.

## Acceptance

There is a bounded next-product specification with explicit review gates, and v1 behavior/claims remain intact.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
