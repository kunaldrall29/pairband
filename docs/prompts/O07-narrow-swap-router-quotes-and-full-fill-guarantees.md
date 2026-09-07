
# O07 — Narrow swap router, quotes and full-fill guarantees

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O02, O06. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

PairbandRouter, quote adapter, transaction builders and price/amount safety tests.

## Build instructions

Implement a single-pool router for registered long/USDC markets. Buy specifies exact output optionUnits and maximum raw USDC; sell specifies exact input optionUnits and minimum raw USDC. Derive payer and recipient from the initiating caller, validate chain/series/phase/deadline and reject msg.value. Do not accept arbitrary calldata targets, arbitrary payment accounts or arbitrary tokens.

Use the pinned PoolManager unlock/swap/settle/take interfaces. Store an authenticated, single-use unlock context; callback data alone cannot authorize pulling from another wallet. Verify manager caller and active context, apply correct signed v4 amount convention and sorted-token direction, settle only allowed deltas, enforce exact received quantity/full input consumption and all limits. A partial fill must revert, not leave the Protect user partially covered. Leave no residual custody and do not reuse old approvals for unrelated requests.

Quote using the verified compatible Quoter or a tested simulation adapter. Include block/hash, pool identity, quantity, bounds, fee inclusion and expiry. Decode generated transaction data back into semantics and simulate before asking a wallet to sign. Direct narrow-router approval is its own path; do not assume official Universal Router accepts it.

Test raw price conversion with six-decimal option/USDC tokens and both token sort orders. Spot EURC/USDC and option premium USDC/option are different values. Source addresses come from the verified manifest; no Trading API dependency.

## Failure cases and verification

Attack forged callback payer, unsolicited callback, reentrancy, wrong key, zero/overflow amount, deadline expiry, stale phase, insufficient liquidity, slippage violation, partial fill, unexpected native value, malicious recipient and leftover balances. Compare quoted bounds with observed deltas.

## Acceptance

Exact-output buys and full exact-input sells work against pinned v4 pools; any violated economic limit reverts atomically; router cannot spend from an unrelated allowance owner.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
