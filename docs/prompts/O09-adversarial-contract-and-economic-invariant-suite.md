
# O09 — Adversarial contract and economic invariant suite

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O05, O06, O07, O08. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

Stateful Foundry invariant suite, independent model comparisons, threat register and resolved failure evidence.

## Build instructions

Build randomized sequences across several series and actors: mint, long/receipt transfer, matched cancel, add/remove liquidity, buy/sell, exercise, advance time and redeem. Track assets and claims with the independent O02 model. Assert backing sufficiency, no cross-series effects, exact fee separation, no unbacked mint, correct phase permissions and aggregate matured payouts. Model direct native/ERC20USDC donations separately.

Exercise malicious callback/payer attempts, reentrant token surrogates in isolated unsupported-token tests, unauthorized admin actions, supply manipulation, forged pool registration and initialization races. Test full-fill requirements and exact-output coverage across sparse/out-of-range liquidity. Check all deadline endpoints and repeated timestamps; ensure no blanket pause traps contractual exits or LP removals.

Add property checks for split versus batch mint/cancel/exercise, receipt transfer followed by redemption, cumulative allocations and bounded rounding, large bounds and empty series. Distinguish expected fee rounding from a solvency discrepancy. Inspect all source for privileged transfer, arbitrary call, delegatecall, self-destruct and rescue paths.

Run supported static analysis and record actual tool versions/findings. A scanner warning is triaged with evidence; a green scan is not an audit. Preserve minimized failing seeds and regression cases for material bugs. Do not expand low-value UI tests in this stage.

## Failure cases and verification

Require documented coverage of each threat, reproducible fuzz seeds, independent conservation checks and successful post-cutoff LP exits. Identify Arc-runtime behaviors that remain untested locally and explicitly carry them into O10.

## Acceptance

No known critical/high correctness issue remains in the tested local design; unresolved independent review and Arc-specific evidence are reported separately.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
