
# O05 — Physical exercise and matured writer claims

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O04. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

Working exercise/finalize/redeem functions, mixed-asset accounting, rounding specification and direct-call recovery instructions.

## Build instructions

Implement exercise(q) only for exerciseStart<=t<exerciseEnd. Pull q*A EURC from caller, burn q long units, reduce accountedUSDC by q*C, increase accountedEURC and exercisedUnits, and pay q*C USDC to caller atomically. No reference oracle, app session, Graph query or keeper may gate this contractual action. Do not burn receipts during exercise. Partial exercise is allowed.

At maturity freeze W0/U0/E0 from accounted reserves and outstanding writer units. Finalization is permissionless and performed lazily inside redemption if needed; handle the empty series without division by zero. Redeem(q) uses redeemedUnits R and pays floor((R+q)*U0/W0)-floor(R*U0/W0) and the equivalent EURC amount, burns receipts and advances R. This cumulative allocation pays all snapshot assets by the last claim and bounds individual rounding error below one raw unit per asset. Keep the snapshot denominator fixed. Do not use actual donated balances to inflate claims.

No writer withdrawal during the exercise interval, no writer claim expiry, no conversion of expired long tokens into reserve claims, and no admin override to extend times or redirect assets. A blocked stablecoin transfer reverts the operation, preserving accounting. Receipt transfers carry future mixed-asset rights but not historical premium.

Add typed previews and SDK calls for partial/full exercise and redemption. Direct contract use must work when API/indexer/reference marks are absent. Record protocol events with amounts and units needed for reconciliation.

## Failure cases and verification

Test exact endpoints, late approval then expired exercise, reference-provider absence, all/no/partial exercise, 3-unit dust fixture, randomized receipt distribution/order, double claims, reentrancy, donation exclusion, empty-series finalization and accounting conservation after all receipts burn.

## Acceptance

Every issued exercisable unit has exact backing; matured payouts sum to snapshots; all existing exit rights survive new-risk pause without a trusted scheduler.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
