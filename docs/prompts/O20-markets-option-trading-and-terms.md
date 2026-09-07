
# O20 — Markets, option trading and terms

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O14, O18. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

Series market table/detail, buy/sell tickets, sparse-data charts and verified contract/term views.

## Build instructions

Implement /markets and /markets/[seriesId] with status/expiry/strike filters and at most the actually listed assets. Display strikeUSDC/EURC separately from premiumUSDC/option, exact quantity behind each buy/sell quote and full exercise window. No upcoming token appears as a tradeable pool before deployed evidence.

Reuse exact-output Buy and exact-input Sell tickets. Keep full-fill bounds, deadline, chain/target validation and refreshed review behavior. Compare size-specific quotes; a market midpoint cannot stand in for an executable price. Display no liquidity and provider unavailable distinctly.

Terms show physical delivery, multiplier, immutable times, long/receipt/vault identities, registered PoolKey, fee, tick spacing and hook. Once exercise begins, replace trading CTAs with exercise guidance while leaving contract/token transfer information honest. A soft UI cutoff is conservative but never extends contractual time.

Build history from actual option pool swaps, with provenance and sparse-data alternatives. Do not generate candles from underlying EURC observations. Explain unsupported external pools and known official/self-deployed dependency provenance. Route advanced liquidity to O22's later component without a fake functional panel.

## Failure cases and verification

Check sorting/filtering, stale quotes, different series with same symbols, token-sort price inversion, expired market, sparse/missing chart data, malicious series ID and long contract addresses. Compare actual event-derived volume to the indexer.

## Acceptance

Markets allow meaningful comparison/trading and make expiry and contract identity visible without inventing prices, depth or distribution.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
