
# O11 — Database, API foundation and private preferences

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O00, O02. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

Database migrations, API service, authentication/session layer, early-access persistence and a local operations setup.

## Build instructions

Implement the data schema and common API/error types from the reference documents using Postgres and a typed query layer. Store monetary integers exactly, index event/checkpoint and holder queries, and keep chain-derived projections separate from private early-access/preferences data. Generate migrations with a reversible migration plan; do not drop existing user records to fit the new product.

Build health/readiness, validated environment loading, structured logging, request IDs, bounded pagination, rate limits and safe errors. Add public deployment/series stubs only as explicitly unavailable until the indexer arrives. Do not return fake live data. The frontend's early-access form must persist real validated submissions, deduplicate email privately and record separate privacy/update consent.

Implement nonce-based wallet sign-in for private settings with domain/URI/chain/expiry binding, one-use nonce consumption, supported contract-wallet verification, opaque secure cookies, CSRF defenses and logout/revocation. Public onchain portfolio reads need no session. Session identity must not be accepted as proof of token ownership for financial actions.

Create pending email verification records and outbox infrastructure with provider disabled until configured; do not send messages as part of this build. Add retention/deletion policies for personal data and server-only secret boundaries. Prefer Postgres job leases over introducing mandatory Redis.

## Failure cases and verification

Test nonce replay/expiry/wrong domain, contract-wallet verification, cross-user preference access, CSRF, rate limit, duplicate early access, SQL injection, large inputs, secret redaction and transaction rollback. Ensure private responses cannot leak through public caching.

## Acceptance

API and migrations run locally, genuine early-access records persist, private data access is enforced, and no financial success or email delivery is fabricated.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
