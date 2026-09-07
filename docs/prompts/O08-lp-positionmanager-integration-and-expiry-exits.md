
# O08 — LP PositionManager integration and expiry exits

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O07. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

Verified NFT liquidity adapter, market seed scripts, add/decrease/collect builders and inventory reconciliation.

## Build instructions

Inspect the pinned v4 PositionManager and its actual Permit2/token-approval requirements. Use its existing NFT position model instead of inventing pooled share accounting. Generate typed helpers for initializing/seeding a registered pool atomically, adding liquidity, decreasing liquidity, collecting fees and reading NFT ownership/range/inventory. Keep maker/LP capital separate from series backing.

Translate user-facing USDC-per-whole-option ranges into ordered raw currency sqrt ratios/ticks with tested SDK math, including both sort directions and valid tick spacing. Show desired versus actual consumed assets and return unused funds. Bind owner/recipient appropriately and require exact reviewed slippage limits. A fee-on-input quote rounding decision must not discard meaningful option units.

Create a deterministic local maker fixture that mints backed options with one funding account and supplies separate free USDC/options to the pool. Record the writer receipt balance independently. Define inventory exit steps: decrease/collect NFT position, receive option tokens, then independently exercise during the valid window with EURC. Do not describe fee collection as automatic exercise or assume an out-of-range position contains no expiring options.

Maintain post-cutoff decrease/collect functionality and read paths for matured series. Add explicit integration evidence of pool initialization caller/price constraints from O06.

## Failure cases and verification

Test ownership transfer, unauthorized NFT management, minimal liquidity, extreme ticks, sort inversion, fee collection with zero decrease, partial/full withdrawal, expired option inventory, new-risk pause and exercise cutoff. Confirm vault reserves never appear as LP free balance.

## Acceptance

An actual PositionManager NFT can be seeded, traded against and exited through all lifecycle phases, with inventory/fees reconciled to chain state.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
