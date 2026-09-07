
# O16 — Shared design system, app shell and wallet states

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O00, O02. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

Accessible UI primitives, responsive shell, typed financial formatters and complete wallet/transaction state components.

## Build instructions

Implement the exact landing/app visual tokens, fonts, spacing and responsive behavior from the two design specs. Build AppShell with 224 px desktop sidebar and 64 px topbar, and four mobile destinations Protect/Earn/Markets/Portfolio. Advanced LP actions live under market detail; do not create a fifth/sixth crowded bottom tab.

Create AmountInput, AssetValue, ExerciseWindow, NetworkBadge, DataFreshness, RiskNotice, dialogs, tables, cards and empty/loading/error states. Units must distinguish USDC/EURC strike, USDC/option premium, whole options and raw amounts. Use tabular digits, full accessible labels, keyboard navigation and non-color-only status. Provide chart table alternatives and reduced motion.

Integrate the verified wagmi/viem configuration for read/connect/switch behavior. Model disconnected, wrong network, changed account, rejected signature, approval pending, action submitted, confirmed, replaced, reverted and unknown outcomes. Show USDC gas; native18/token6 balances are one asset. Max calculations reserve rounded-up gas and pending obligations.

Centralize transaction review semantics and approved target checks for later screens. Browser code never receives server secrets. Do not add forced wallet connection to browse public markets or marketing pages. Skeleton data is not a fake balance.

## Failure cases and verification

Check320/390/768/1440px layouts,200% zoom, keyboard/focus trapping, screen-reader names, wrong network, account changes and long numeric values. Test representative real money formatters rather than thousands of spacing snapshots.

## Acceptance

Both public and app screens can reuse consistent components, and wallet/error states remain understandable without hidden or fabricated financial values.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
