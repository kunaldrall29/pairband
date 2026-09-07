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
