
# O26 — Integrated end-to-end and accessibility verification

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O10, O17, O19, O20, O21, O22, O23. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

Reproducible local lifecycle E2E, actual testnet evidence, responsive/accessibility review and resolved integration defects.

## Build instructions

Exercise the complete product with real local contracts and API/indexer: writer mints, separate LP capital seeds, buyer purchases exact coverage, writer sells, market cutoff closes trading, buyer deliversEURC, writer redeems mixed assets and LP exits. Use deterministic local time for automated tests only. Reuse legitimate public testnet series/receipts from O10 and never label local time travel as Arc evidence.

Use Playwright with controlled test wallets and actual transaction-state assertions. Check approval/review/receipt semantics, balance deltas, deadline UI and reference-price independence. Optional Circle/Graph features are tested only if enabled and verified; disabled adapters must not break core acceptance.

Audit phone/tablet/desktop at 390/768/1440px plus 320px/200%zoom edge cases. Verify full keyboard flows, focus restoration, screen-reader labels, errors, chart tables, reduced motion and readable currency units. Capture screenshots of key states: no liquidity, partially exercised reserves, expired long, expired LP option inventory, unknown receipt and paused new risk.

Measure performance with a documented profile, API/indexer freshness and recoverability after service restart. Fix material defects and rerun affected journeys. Avoid expanding unrelated snapshot tests once the concrete integration risk is resolved.

## Failure cases and verification

Assert no frontend fake success, no zero fallback for missing financial data, no collateral/LP double count, no wrong-network submission and no blocked contractual exit due to optional service failure. Distinguish implemented, local-tested and Arc-verified coverage.

## Acceptance

The product's complete lifecycle works with evidence and understandable failure states; any remaining release/security gaps are explicit rather than hidden behind passing UI tests.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
