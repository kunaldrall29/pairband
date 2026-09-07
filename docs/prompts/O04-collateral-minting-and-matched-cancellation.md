
# O04 — Collateral minting and matched cancellation

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O03. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

Working mint/cancel functions with atomic asset accounting, fee separation, protocol events and invariant tests.

## Build instructions

Implement mint(q) only during Trading while new risk is enabled. Validate q/cap, pull q*C raw USDC into the series, verify exact received backing, collect ceil(backing*feeBps/10000) separately into the immutable recipient, then mint equal q long/receipt units to caller. All effects must revert together on any failure. Gas is not paid out of reserved collateral. Use safe token operations and nonreentrant checks-effects-interactions appropriate to the exact supported assets.

Implement cancel(q) only during Trading and regardless of new-risk pause. Caller must hold matched q long and q receipt units; burn both, reduce writer units and accountedUSDC, return q*C to caller. Do not refund issuance fees, traded premium or gas. Do not allow cancellation after some exercise has changed the backing composition.

Keep accounted reserves distinct from actual token balances so unsolicited transfers/native USDC donations do not mint claims. Avoid a recover-excess function for supported collateral. Emit the exact amounts needed for independent indexing. Provide read previews that agree with write behavior but do not substitute for simulation.

Expose these functions through generated SDK builders and document direct approval to the vault for USDC backing plus fee, with amount/gas budgeting. Do not add mint-and-sell atomic behavior in this stage; the writer owns unsold longs after mint.

## Failure cases and verification

Test exact/small/maximum quantities, insufficient balance/allowance, fee transfer failure, unsupported transfer behavior, reentrancy, native/token donations, repeated cancel, unmatched tokens, pause behavior and every timestamp boundary. Confirm actual balances cover accounting and no minted quantity is unbacked.

## Acceptance

Independent model and contract agree through mixed mint/cancel sequences; the nonzero fee fixture leaves full backing in the vault and only fee in the recipient.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
