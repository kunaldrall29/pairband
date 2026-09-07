
# O22 — Advanced LP interface and expiring inventory

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O08, O20, O21. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

NFT liquidity position management, clear capital/range display and post-cutoff inventory exits.

## Build instructions

Implement the advanced Liquidity tab inside market detail with the verified PositionManager adapter. Show actual NFT owner, registered pool, fee, rangeUSDC/option, liquidity, option inventory, USDC inventory and collectible fees by currency. The collateral vault's reservedUSDC cannot appear as available LP balance.

Build add-liquidity review with correct token ordering, price/tick conversion, desired/actual amounts, unused-fund behavior, slippage, allowance/Permit2 details and recipient. Use tested pinned periphery methods, not invented method names from generic SDK examples. Respect current registry pause and lifecycle.

Keep decrease/collect available after trading stops. Display the resulting option tokens and the exact exercise window. Explain that withdrawing inventory and exercising with EURC are separate reviewed transactions. Fee collection alone does not exercise or fully remove option inventory. After expiry, show expired options honestly while still allowingUSDC/fee withdrawal.

Add warning states for out-of-range liquidity, concentrated inventory, sparse quotes and impending expiry. Do not show projected fee APY, a pooled managed vault deposit or an automated rebalance toggle. Provide a concise advanced-user explanation of options market-making risk.

## Failure cases and verification

Test transferred NFT ownership, wrong manager/pool, invalid ticks, minimal liquidity, partial/full reduction, collectible fees with no current liquidity, new-risk pause, cutoff and expired option inventory. Verify actual wallet balances after each operation.

## Acceptance

LPs can inspect and withdraw actual positions through expiry without confusing AMM assets with writer backing or automatic exercise.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
