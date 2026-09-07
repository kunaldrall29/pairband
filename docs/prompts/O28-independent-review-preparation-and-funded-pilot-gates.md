
# O28 — Independent review preparation and funded-pilot gates

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O09, O26, O27. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

Review-ready security package, legal facts memo, authority/incident plan and evidence-based readiness ledger.

## Build instructions

Prepare the independent review bundle: frozen commit, compiler/dependency provenance, architecture, threat model, source map, invariants, minimized failures, deployed testnet evidence and known limitations. List all trust/privileged paths including new-risk pause, stablecoin transfer restrictions, periphery approvals and direct recovery. Do not issue an audit badge for internal tests or a static scan.

Create a jurisdiction/customer facts memo for counsel: product options rights, writer collateral, pool trading, operator listing/fees/pause powers, website access, custody assumptions, distribution and intended users. Ask for specific derivatives/venue/solicitation/eligibility/privacy conclusions through the team's normal legal process; do not invent a generic license clearance. Terms/risk/privacy documents remain drafts pending appropriate review.

Define a limited funded pilot with justified caps, maker inventory/spreads, fee policy, monitoring, signer separation, incident roles and user recovery. Preserve existing claim rights; generic shutdown procedures cannot erase exercise/redemption obligations. Include network/issuer outage and missed-exercise scenarios.

Turn each release gate into owner/status/evidence/commit/environment/date fields. Separate security findings, legal review, deployment support and commercial readiness. Prepare concrete remediation work without sending emails, engaging vendors or publishing materials unless authorized. September 30 never overrides an unmet critical gate.

## Failure cases and verification

Review every real-fund enabling flag against evidence. Check outdated audit commit, unsupported mainnet config, unresolved high-risk issue, missing maker and vague legal status. An absent external review must remain pending, not quietly marked complete.

## Acceptance

A reviewer can assess the product from concrete artifacts, and the readiness ledger truthfully identifies what still prevents funded use.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
