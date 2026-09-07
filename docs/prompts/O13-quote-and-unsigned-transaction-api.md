
# O13 — Quote and unsigned transaction API

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O07, O11, O12. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

Runtime-validated endpoints, generated OpenAPI, typed SDK client and semantic transaction verification.

## Build instructions

Implement the reference API contract with discriminated request schemas. Quotes bind series, side, exact quantity, account, slippage, pool identity, quote block and expiry. Buy returns maximum USDC for exact options; sell returns minimum USDC for full input. Resolve current phase, pause, balances and allowance using RPC, not only cached SQL. Return typed NO_LIQUIDITY/EXPIRED/UNVERIFIED states instead of empty calldata.

Build /actions/prepare for mint/cancel/exercise/redeem and validated LP operations from generated ABIs. Show full asset input/output and separate issuance fee. Exercise preparation must work without a reference-price or Graph service. Redemption previews use both snapshot assets and cumulative-allocation rounding. Check required allowance on the correct spender for vault, custom router or PositionManager.

Generate unsigned transactions with validated chain, sender, target, value, semantic arguments and bounded deadline. Decode and assert the generated call before returning it; the client repeats those checks. Cache only safe quote/read data and never share wallet-specific payloads across users. Invalidate review when refreshed economic limits change.

Implement monitoring registration/idempotency without claiming an accepted hash is settlement. Generate OpenAPI3.1 and typed client from the same schemas, including errors and example requests. Rate-limit expensive simulations and add bounded timeout/fallback behavior.

## Failure cases and verification

Test malformed amounts/addresses, wrong chain/target, payload injection, account switches, phase change during preparation, stale quote, absent liquidity, unknown receipt, duplicate monitoring and differing slippage units. Ensure no endpoint signs user transactions.

## Acceptance

API responses are executable or explicitly unavailable; all prepared calls match reviewed semantics, and client/contract/API types share one generated source.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
