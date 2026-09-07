
# O02 — Integer domain model, phases and payoff mathematics

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O00, O01. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

Shared bigint amount/phase libraries, runtime schemas, deterministic examples and an independent reference model for later contract tests.

## Build instructions

Implement option/receipt decimals6, underlying/settlement decimals6, A=100 raw EURC per raw option unit and immutable integer C. One whole option covers100 EURC; C=110 means strike1.10. Represent raw amounts as bigint and JSON integer strings. Provide named conversions among raw option units, displayed option quantity, EURC exposure and USDC obligation. Reject excessive input precision rather than silently round up; return any unprotected remainder explicitly.

Implement Trading, Exercise and Matured interval checks exactly, including Scheduled and equal-boundary timestamps. Derive phase from observed chain time; repeated timestamps across blocks are valid. Implement bounded quantity/cap checks, issuance fee ceiling, exact mint/cancel/exercise obligations and fixed-snapshot cumulative-allocation redemption previews. Use full precision and overflow-aware contract bounds.

Implement educational holding-plus-put, standalone long P&L and cash-secured writer outcomes. Premium and fees are separate from collateral and spot value. Include missed-exercise outcomes and undefined cost basis. Reference marks are optional information. Use the supplied large, partial-exercise, dust, fee and phase fixtures; add independently generated cases that test conservation across sequences.

Export typed errors and schemas used by contracts tests, API and UI. A chart may convert already-computed results into pixel coordinates; no authoritative amount should pass through JavaScript Number.

## Failure cases and verification

Test smallest raw unit, zero/negative inputs, very large values, fraction parsing, unsupported precision, all exact boundaries, shuffled redemption order, dust totals, fee/collateral separation, example 200 USDC premium and stale/no reference marks. Detect a 100× or1e6× display mismatch explicitly.

## Acceptance

All shared examples produce the specified values, and an independent state model can track claims/reserves without importing contract implementation code.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
