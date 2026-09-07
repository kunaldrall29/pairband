
# O27 — Liquidity, pricing and product economics validation

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O09, O14, O26. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

Transparent scenario/benchmark report, maker inventory plan, unit-economics model and go/no-go findings.

## Build instructions

Evaluate whether actual option markets can remain useful as time/FX change. The lifecycle hook does not provide fair pricing. Model time decay, spot movement, volatility assumptions, transaction costs, spread, inventory imbalance, exercise behavior and stablecoin risk. Label assumed values; do not manufacture a live volatility feed or institution partnership.

Benchmark quote size, effective spread, depth, fill success and maker/LP losses across several small standardized series and varied liquidity. Compare narrow versus broad ranges and changes near exerciseStart. Keep writer backing separate from LP funding and show the capital requirement to offer both sides. Test static liquidity's adverse-selection risk and define human maker repricing/inventory limits before proposing automation.

Model company revenue separately: issuance fee, optional future service revenue, infrastructure, review costs, maker incentives and customer acquisition. Writer premiums are not protocol revenue. Test fee sensitivity against low option premiums; the50 bps authority cap is not a recommended fee. Avoid annualizing a few test trades.

Prepare a factual pilot brief for potential EURC users/writers/makers without contacting anyone automatically. Record observed customer evidence versus hypotheses and define failure criteria such as no committed maker, unacceptable spreads or no repeated hedging need. Grants and prizes do not prove recurring demand.

## Failure cases and verification

Verify formulas/units and scenario conservation, include losses and unused liquidity, separate subsidies from organic flows, and identify dependencies on unverified capital/providers. Do not claim a pricing model is validated just because its code runs.

## Acceptance

The team has a candid capital/quote-quality/business assessment and explicit conditions for a funded pilot, including reasons to delay or narrow scope.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
