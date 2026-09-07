
# O19 — Earn mint-and-sell writer journey

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O04, O18. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

Working writer configuration, mint review, unsold option state, separate sale ticket and matched cancellation UI.

## Build instructions

Implement /earn with explicit Choose terms→Mint backed options→Sell options stages. Convert desired quantity/backing exactly and show unused remainder, immutable cap, locked USDC, separate issuance fee and gas. Explain that the writer receives two different claims and only earns premium if options sell.

Show the writer downside panel, including the example where11,000 USDC backing and200 USDC premium lead to10,000 EURC worth10,000 USDC after exercise at reference 1.00, an800 USDC illustrative loss before costs. State that exercised claims pool across the series and historical premiums are not transferred with receipts.

Prepare and execute the actual mint through the wallet, then read both token balances and reserve evidence. Label success Backed options minted. Fetch a new exact-input sale quote for selected longs; enforce full input/minimum USDC through O07. No guaranteed quoted premium across separate mint/sell transactions.

If sale liquidity is missing, show unsold holdings with Hold, review advanced liquidity, or Cancel matched claims before cutoff. Cancellation requires both balances and does not refund the issuance fee. Keep cancellation available during new-risk pause when phase permits. Do not introduce auto-compounding, public writer vault shares or an APY banner.

## Failure cases and verification

Test nonzero fee, cap reached, partial quantity, failed mint, mint success/sale failure, changed market, unmatched cancellation, phase boundary, receipt transfer and reference-price absence. Check UI never reports mint as earned premium.

## Acceptance

Writers can distinguish backing, unsold longs, receipts and actual sale proceeds and can safely follow the complete mint/sell/cancel lifecycle.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
