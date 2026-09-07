
# O17 — Updated landing page with real early access

You are implementing Pairband options-v2 in the existing app repository. Read repository instructions, docs/MASTER_CONTEXT.md, docs/reference/protocol.md and docs/build-session.json, then inspect relevant existing code and prerequisite evidence. Treat this as a bounded implementation task, not a request for a plan alone. Preserve unrelated work and use pinned, verified interfaces. Do not continue old payment-flow/spot-band behavior on active options routes.

## Prerequisites

O11, O14, O16. Verify recorded evidence, not just a completed checkbox. Core product or required readiness/documentation stage; release scope still follows the gates.

## Required outputs

Complete responsive public landing, interactive payoff explainer, mode-aware CTAs, early-access persistence and visual evidence.

## Build instructions

Implement reference/landing.md section by section: header/hero, Protect/Earn/Trade cards, lifecycle, payoff explainer, market preview, writer-versus-LP explanation, Arc/Uniswap context, risks, FAQ, early access and footer. Use approved copy including manual exercise, premium loss and writer downside. Replace active old payment-flow/SaaS copy rather than appending a contradictory options paragraph.

Build the hero ticket and chart with semantic HTML/SVG. Keep the entire example labeled illustrative, including200 USDC premium. The payoff chart/table uses O14 and includes missed exercise. Never add fake TVL, APY, partners, testimonials, audit badges or prizes. Explain fully collateralized precisely.

Mode drives the CTA: preview early access, verified testnet app, or approved mainnet pilot. Market previews use explicit fixtures in preview or genuine indexed data; missing quotes are unavailable, not0. Wire early access to O11 with validation, privacy/update consent, duplicate-safe generic success and recoverable errors. Sending email is not required for a valid received request.

Add accurate title/description/canonical/OpenGraph and environment-specific indexing policy. Hide unknown footer destinations. Optimize first paint by deferring wallet/chart weight; self-host licensed fonts. Add privacy-conscious conversion events without wallet/email payloads.

## Failure cases and verification

Verify every CTA and FAQ, payoff arithmetic, form persistence/retry/rate limit, preview/live distinction, loading/no-liquidity states, keyboard access and responsive screenshots. Measure performance targets rather than reporting unrun scores.

## Acceptance

A visitor can understand the option product and its obligations, use the educational example and submit a genuine early-access request on a polished responsive page.

## Execution and handoff

Implement the requested artifacts and run the meaningful checks available in this environment. Keep missing external credentials/support as explicit blockers; use named mocks only for tests/preview, never to claim integration completion. Do not perform external transactions, publication or messages without applicable existing authorization. Complete reversible local preparation instead of asking permission for ordinary implementation.

Update docs/BUILD_STATUS.md, docs/DECISIONS.md when choices change, docs/integrations.json and docs/build-session.json. End with changed paths, commands actually run, observed results, evidence locations, unresolved blockers and the next eligible stage. Do not claim an audit, real transaction, independent review or deployment readiness from a scaffold or unexecuted test.


---
