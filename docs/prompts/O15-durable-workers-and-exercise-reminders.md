
# O15 — Durable workers and exercise reminders

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O11, O12. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

Postgres job leasing/outbox, optional verified-email reminders, retries/dead-letter handling and operational status.

## Build instructions

Implement jobs with transactional enqueue, dedupe keys, expiring leases, bounded retries and visible dead-letter states. Schedulers may send opted-in reminders and refresh read models, but phase transitions/finalization/exercise remain onchain and do not require them. Calculate reminder schedules from immutable UTC windows with the deployment/series/recipient-consent version in each dedupe key.

Require verified email and recorded consent before enqueueing delivery. Do not let an authenticated wallet spam an arbitrary unverified address. Keep credentials server-side and emails out of generic logs. Use an adapter with disabled/local-capture mode by default; distinguish queued, attempted, provider-accepted and delivered where the provider supports that evidence. Never equate provider acceptance with exercised options.

Handle deleted preferences, revoked consent, transferred positions and already-expired series before dispatch. A reminder's wording must include the exact window and manual-exercise requirement. Do not send promotional content under transaction-reminder consent. Prepare unsubscribe/settings and deletion behavior.

Provide health metrics for leased/dead jobs and dispatch delays. Tests use local capture adapters; actual external messages require a configured provider and appropriate consent/authorization. No wallet keys or transaction broadcasting in the worker.

## Failure cases and verification

Test worker crash/restart, duplicate lease, clock drift, DST display, reminder near expiry, revoked consent, unverified destination, retry exhaustion and provider failure. Prove exercise/redeem still works with all workers stopped.

## Acceptance

Best-effort reminder infrastructure is durable and honest, while the core product has no scheduler or email-provider dependency.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
