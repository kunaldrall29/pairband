
# O21 — Portfolio, exercise, cancellation and writer redemption

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O05, O15, O18. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

Distinct holdings tabs and fully functional exit actions, reminder preferences and direct-contract recovery guidance.

## Build instructions

Implement /portfolio and series position detail with separate long, writer receipt and LP tabs. Show quantities and known/unknown cost basis; do not sum notional, backing and LP inventory. Transferred receipts retain future reserve rights but not prior premium attribution.

Before exerciseStart show eligible sell/cancel paths and exact opening time. During the exercise window allow partial/full exercise, showing EURC delivery, USDC output, option burn, gas and deadline. EURC approval is to the vault. Controller burning of the caller's longs does not require inventing a Permit2 approval. A reference mark may warn but must not block valid exercise. If an approval finishes after expiry, show loss of the right honestly.

After maturity show writer redemption of both USDC/EURC, fixed-snapshot preview and cumulative-allocation rounding. Burn actual receipt units and confirm transfers/events. Expired longs have no writer payout. Writer claims do not expire and remain accessible with the API/Graph/worker stopped through the recovery guide.

Integrate reminder opt-in/preferences from O15 with verified email and best-effort language. Show remaining action time using observed chain time, with stale-data state. Keep exercise/redeem/cancel appropriately available during new-risk pause.

## Failure cases and verification

Test partial/all/no exercise, mixed reserves, bounded rounding and final claim, unmatched cancellation, transferred receipts, unknown cost basis, insufficient EURC or gas, missed deadline, worker/reference outage, repeated redemption and live phase changes while screen is open.

## Acceptance

Every claim type has the correct rights and exit flow, with actual receipt evidence and no promise of automatic exercise or original-USDC repayment after assignment.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
