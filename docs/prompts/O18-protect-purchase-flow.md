
# O18 — Protect purchase flow

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O13, O16. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

Working exact-coverage option buying journey, quote review, approvals, confirmation and portfolio handoff.

## Build instructions

Implement /protect from reference/app-ui.md. Accept EURC exposure to the supported four-decimal granularity, select an actually available strike/window, convert to exact raw option quantity with O02, and show any unprotected remainder. Buying needs premium/gasUSDC, while EURC is needed later for exercise; do not require an EURC deposit during purchase.

Fetch an exact-output quote for the selected coverage. Display option quantity, EURC deliverable, strike, fixed USDC exercise amount, premium, max spend, gas, fee inclusion, allowance target, quote expiry and full exercise window. Missing reference data is informational; missing executable liquidity disables Buy. Do not silently fall back to an exact-input partial purchase.

Run approval only when needed, using the correct narrow-router spender and bounded amount. Refresh an expired quote after approval and ask for renewed economic review if limits change. Validate chain/target/calldata locally, simulate, then use the user's wallet to submit within its normal user-confirmed flow.

Track real receipt and expected balance/event evidence before purchase success. Show actual premium and quantity, transaction link, exercise dates and optional reminder settings. A submitted hash is not protected exposure. Preserve input during wallet rejection/provider errors and invalidate on account/network changes.

## Failure cases and verification

E2E exact quantity, slippage rejection, insufficient premium/gas, insufficient future EURC warning, approval expiry race, no liquidity, wallet rejection, unknown/replacement receipt and trading cutoff. Confirm no native/ERC20USDC balance double count.

## Acceptance

A funded local/testnet wallet can buy precisely the selected coverage and understand the remaining manual exercise obligation from the success screen.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
