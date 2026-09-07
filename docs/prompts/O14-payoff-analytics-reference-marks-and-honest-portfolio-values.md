
# O14 — Payoff analytics, reference marks and honest portfolio values

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O02, O12. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

Payoff service/UI data, timestamped reference adapter, realized-trade analytics and explicit unavailable-value handling.

## Build instructions

Implement the shared educational payoff model for EURC holding plus put, standalone option and writer backing outcomes. Reuse integer/decimal functions and supplied fixtures. Include missed exercise, fees and gas as distinct assumptions. A hypothetical slider value never enters the actual exercise contract. Show200 USDC illustrative premium as an example, not a live quote.

Add an informational reference-mark adapter only for a source whose access, licensing, pair and timestamp semantics are verified. Record provider, observation time, units, market-hour limitations and stale status. Do not assume a deep 24/7 official FX reference or use StableFX without access. If no valid source exists, keep the reference unavailable and core contract actions functional.

Compute actual trading volume, fee totals and user sale proceeds from confirmed events. Distinguish writer historical premium, LP fees, protocol issuance fees and option inventory. Imported/externally transferred holdings have unknown cost basis unless evidence exists. No fabricated APR, APY, realized P&L or zero value for an unquoted active option.

Expose chart/table data with provenance and usable empty states. Market midpoints are indicative marks; executable size-specific quotes come from O13. Do not paint underlying EURC prices as option candles. Provide appropriately aggregated data without leaking private preferences.

## Failure cases and verification

Test all payoff fixtures, absent/stale/weekend marks, transferred claims, missing cost basis, sparse swaps, double-counted volume and differing price units. Compare writer example loss800 USDC at spot 1.00 with the independent arithmetic.

## Acceptance

Analytics explain assumptions and distinguish actual, estimated and illustrative data; no reference outage disables exercise or writer redemption.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
