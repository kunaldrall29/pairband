
# O24 — Optional Circle funding and user-controlled onboarding

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O01, O18. Verify recorded evidence, not just a completed checkbox. Optional; enable only when the stated support/product gate is satisfied.

## Required outputs

Capability-gated USDC funding adapter/UI, recovery states and evidence; optional wallet onboarding only if specifically enabled.

## Build instructions

First inspect current Circle App Kit capabilities and actual Arc destination support, supported source chain/token, adapter version, fees and error recovery. Mark the stage blocked/disabled if unavailable; a funded Arc wallet remains a complete core path. Do not add a key request or dead button solely for a sponsor logo.

Implement USDC Bridge funding through a verified adapter. Show source-chain amount/fees, destination receipt expectation, separate status stages, actual hashes and retry/recovery instructions appropriate to the provider. Store minimal resumable transfer references. Do not claim a cross-chain bridge and later option purchase are atomic. Destination funds become usable only after verified arrival and gas budgeting.

If Unified Balance is enabled, expose provider-confirmed spendability and fees; never count it as already deposited option collateral. On Arc testnet, App Kit Swap's documented asset set excludes Pairband options, so all option trading stays through the v4 route. Spot funding swap is a separate supported feature.

User-controlled Circle Wallets are an additional feature flag: verify actual chain support, custody/recovery UX, consent and transaction signing before implementing. Do not silently switch to developer-controlled custody. API credentials remain server-side and no unsupported wallet integration blocks existing external-wallet users.

## Failure cases and verification

Test unsupported chains/tokens, source gas shortage, provider outage, interrupted bridge, destination delay, reload recovery, wrong network and insufficient destination gas. Use mocks only in tests; real integration claims need actual provider/chain evidence.

## Acceptance

Funding improves a working options product where supported; unsupported or unconfigured Circle services degrade gracefully without disabling direct funded-wallet use.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
