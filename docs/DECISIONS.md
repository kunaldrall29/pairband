# Decisions

## ADR-0001 — Options-v2 greenfield bootstrap (O00)

- **ID/date/owner:** ADR-0001 / 2026-09-07 / pairband-build
- **Question:** How should the empty pairband repository adopt the options-v2 kit?
- **Existing constraint:** Repo contained only Apache-2.0 LICENSE and a pre-options README; no app code.
- **Options evaluated:** (a) invent legacy payment-flow migration; (b) greenfield pnpm workspace matching protocol §8; (c) delay bootstrap.
- **Decision:** Greenfield pnpm workspace with apps/web, apps/api, apps/worker and packages/domain, sdk, ui, config, contracts, database. Import kit under docs/. Default mode `preview`. Mainnet fields null.
- **Affected:** repository layout, AGENTS.md, env schemas, BUILD_STATUS
- **Migration consequences:** Old README product wording superseded; LICENSE retained. No deployed claim paths existed to preserve.
- **Source/evidence:** docs/MASTER_CONTEXT.md, docs/reference/protocol.md, docs/evidence/o00/
- **Unresolved review:** Official Uniswap v4 Arc deployments unverified; Foundry not yet installed; Arc RPC not yet queried (O01).

## ADR-0002 — Production / audit / mainnet honesty bounds

- **ID/date/owner:** ADR-0002 / 2026-09-07 / pairband-build
- **Question:** Can this agent declare the product “production-level, security-audited, and mainnet-ready” in one pass?
- **Existing constraint:** Release gates Gate0–Gate5; protocol forbids inventing audits, mainnet addresses, or official Uniswap Arc deployments.
- **Options evaluated:** (a) claim readiness immediately; (b) implement maximal Gate1 code + audit package while keeping external gates explicit; (c) stop at preview.
- **Decision:** (b). Build production-grade contracts/domain/tests and prepare independent-review artifacts. Do **not** claim a professional audit or mainnet release until: independent review closes critical/high findings; official Arc mainnet + Uniswap periphery (or reviewed self-deploy plan) are verified; legal/maker gates pass.
- **Affected:** BUILD_STATUS labels, marketing copy, deployment manifests
- **Source:** docs/reference/release-gates.md, O01 evidence (Uniswap Arc not listed)
- **Unresolved:** External auditor engagement; official Uniswap on Arc; Arc mainnet config; maker capital; counsel sign-off

## ADR-0003 — Postgres outbox without Redis (O11/O15)

- **ID/date/owner:** ADR-0003 / 2026-09-07 / pairband-build
- **Question:** Should Pairband introduce Redis for job queues and session storage?
- **Existing constraint:** O11 prefers Postgres job leases; Render free tier simplicity; secrets stay server-side.
- **Options evaluated:** (a) Redis + BullMQ; (b) Postgres `SKIP LOCKED` outbox; (c) in-process only.
- **Decision:** (b). `outbox_jobs` with dedupe keys, expiring leases, bounded retries, dead-letter. Sessions/nonces hashed in Postgres. Redis remains optional later if scale requires it.
- **Affected:** packages/database, apps/api, apps/worker
- **Source/evidence:** docs/reference/data-schema.md, docs/evidence/o11/, docs/evidence/o15/
- **Unresolved:** Production email provider configuration; reminder schedule after O12 series indexing

## ADR-0004 — Preview defaults for API series and reference marks (O11/O14)

- **ID/date/owner:** ADR-0004 / 2026-09-07 / pairband-build
- **Question:** What should public series/quote/mark endpoints return before the indexer exists?
- **Decision:** Return explicit unavailable / 503 INDEXER_UNAVAILABLE states. Never invent live series, zero premiums, or FX marks. Educational payoff endpoint is labeled `illustrative` and reuses domain math fixtures only.
- **Affected:** apps/api `/v1/series*`, `/v1/reference-marks`, `/v1/analytics/payoff`
- **Unresolved:** Licensed reference-mark source selection (O14 full)


## ADR-0003 — Arc docs MCP + skill adoption (docs-only)

- **ID/date/owner:** ADR-0003 / 2026-09-07 / pairband-build
- **Question:** How should agents consume Arc documentation going forward?
- **Existing constraint:** Funded-wallet core remains primary; O24 Circle funding/wallets disabled; App Kit must not be assumed to swap option tokens.
- **Options evaluated:** (a) ignore skills/MCP; (b) project MCP + evidence notes, keep product gates; (c) enable App Kit/wallets as core.
- **Decision:** (b). Add `.cursor/mcp.json` pointing at public `https://docs.arc.io/mcp` (no credentials). Prefer `https://rpc.testnet.arc.io` over skill examples citing `.arc.network`. Record Osaka EVM, 20 Gwei floor, dual USDC decimals, system emitter in `docs/evidence/o01/arc-platform-notes.md`. Do **not** enable Circle funding/wallets/swap as core path.
- **Affected:** agent tooling, integrations.json optional statuses, O01 evidence
- **Source/evidence:** docs.arc.io connect/evm/gas/addresses; Circle use-arc skill RPC discrepancy note
- **Unresolved:** Live Arc MCP session may be unavailable in some agent sandboxes — WebFetch remains fallback

## ADR-0004 — Pairband-deployed Uniswap v4 test instance (O06)

- **ID/date/owner:** ADR-0004 / 2026-09-07 / pairband-build
- **Question:** How to proceed without official Uniswap v4 on Arc?
- **Decision:** Pin `Uniswap/v4-core@v4.0.0` for local Anvil tests; implement `PairbandLifecycleHook` + `MarketLauncher`. Label any future Arc deploy as **Pairband-deployed testnet instance**, never official Uniswap. Mainnet Uniswap fields remain null.
- **Source/evidence:** docs/evidence/o01/uniswap-arc-decision.md, docs/evidence/o06/
- **Unresolved:** Official Arc Uniswap listing; periphery PositionManager seed path (O08); Arc-specific callback/sender suite (O10)

## ADR-0005 — Landing early access without live markets (O17)

- **ID/date/owner:** ADR-0005 / 2026-09-07 / pairband-build
- **Question:** Can O17 ship while O14 is only fixture-deepened and O12 is blocked?
- **Decision:** Yes for preview. Landing uses illustrative payoff series from domain fixtures, Example market cards, and real early-access persistence via O11. No live quotes/TVL. O12 remains required before claiming indexed markets.
- **Affected:** apps/web landing, packages/domain payoff helpers, docs/evidence/o14+o17
- **Unresolved:** Playwright responsive screenshots; licensed reference marks
