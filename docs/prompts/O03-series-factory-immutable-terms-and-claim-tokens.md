
# O03 — Series factory, immutable terms and claim tokens

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O02. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

Nonupgradeable series/token contracts, curated registry/factory, generated ABIs and creation/authority tests.

## Build instructions

Design deployment relationships before implementation: one vault with one controller-minted long token and one writer receipt token per series. Both ERC20 tokens are transferable and six-decimal. Only their vault can mint/burn; burn actions are tied to caller-authorized lifecycle operations. Do not add an unrelated public burn that invalidates the stated supply invariant.

Validate supported EURC/USDC addresses and decimals, A=100, C positive with safe limits, ordered timestamps, fee bounds/recipient and immutable cap. Prevent duplicate/confusing series registration and expose full terms via read methods/events. Include chain/factory/nonce in series identity. Preserve separate long/receipt addresses and descriptive names; symbols are not identifiers.

Implement limited administrative authority for creating/listing new series and pausing new risk. Existing terms, collateral recipients and claim rules cannot be updated. Clearly separate a curated listing registry from blanket permissioned ownership. If a registry call is needed for mint pause, keep exercise/redemption independent of mutable registry decisions.

Generate an authority matrix and deployment sequence. Prefer standard audited token/access primitives without claiming the composed protocol is audited. No proxy, delegatecall executor, arbitrary collateral sweep, token tax, hidden minter, self-destruct path or blanket ERC20 transfer pause. Prepare source artifacts and constructor validation suitable for later explorer verification.

## Failure cases and verification

Test unauthorized mint/burn/admin calls, constructor bounds, fee cap, repeated IDs, wrong token addresses, unknown series, receipt transfer, chain-domain identity and attempted term mutation. Review every external/admin function against the published authority matrix.

## Acceptance

Terms and token identities are immutable, supplies begin at zero, authority is minimal and verifiable, and generated ABIs match compiled contracts.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
