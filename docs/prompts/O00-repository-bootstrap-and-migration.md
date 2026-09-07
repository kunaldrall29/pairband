
# O00 — Repository bootstrap and migration

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

None. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

A repository inventory, an options-v2 migration ADR, a pnpm workspace or compatible existing structure, imported active specifications, strict configuration schemas, local setup documentation and a truthful initial build-status ledger.

## Build instructions

Inspect the actual requested repository, its AGENTS.md, branch/worktree status, package manager, app routes, contracts, licenses, CI and user changes. Identify any existing spot-band, attestation, payment-platform or managed-vault code. Classify it as reusable infrastructure, obsolete feature or unresolved economic dependency. Preserve unrelated work and historical artifacts; do not delete a deployed contract path or existing claims interface.

Import this kit's MASTER_CONTEXT.md, reference/, fixtures/ and prompts/ under docs/ in the app repository. Merge agent guidance rather than replacing existing instructions. Create apps/web, apps/api, apps/worker and packages/domain, sdk, ui, config, contracts, database only where the current repo does not already provide compatible equivalents. Keep one package manager/lockfile. Set strict TypeScript, lint/format configuration, documented supported runtime and scripts for dev, build, lint, typecheck and meaningful test groups.

Add environment validation with preview as the safe default, no secrets in public variables, and null/unverified deployment values blocking financial actions. Prepare local Postgres/Anvil services and clear start/stop instructions. Do not claim mocks are Arc. Add docs/BUILD_STATUS.md, DECISIONS.md, integrations.json and build-session.json from templates. Separate a runnable preview from an implemented financial protocol.

Record existing work for future event eligibility. Do not create a new remote, push, publish or alter pairband.com DNS as part of bootstrap.

## Failure cases and verification

Check a clean dependency install in the chosen workspace, script resolution, type checking of scaffolding, secret ignore rules and no hardcoded mainnet fallback. Inspect the migration map for old product wording on active routes. An empty test command cannot count as protocol verification.

## Acceptance

A colleague can start the documented local workspace and see a correctly labeled preview; no user work was overwritten; subsequent stages have explicit locations and blockers.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
