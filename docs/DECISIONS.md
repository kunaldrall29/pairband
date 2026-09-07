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
- **Decision:** Pin Uniswap v4-core (later bumped for periphery `PoolOperation`) and implement `PairbandLifecycleHook` + `MarketLauncher`. Label any future Arc deploy as **Pairband-deployed testnet instance**, never official Uniswap. Mainnet Uniswap fields remain null.
- **Source/evidence:** docs/evidence/o01/uniswap-arc-decision.md, docs/evidence/o06/, docs/evidence/o08/
- **Unresolved:** Official Arc Uniswap listing; Arc-specific callback/sender suite (O10)

## ADR-0005 — Narrow PairbandRouter (O07)

- **ID/date/owner:** ADR-0005 / 2026-09-07 / pairband-build
- **Question:** How should users buy/sell option tokens against registered pools?
- **Decision:** Single-pool `PairbandRouter` with `buyExactOutput` / `sellExactInput` only. Stored unlock context binds payer to entry `msg.sender`. Partial fills revert. Quotes via `PairbandQuoter` eth_call revert payload — not Trading API / Universal Router.
- **Source/evidence:** docs/evidence/o07/, protocol §6
- **Unresolved:** Production gas/slippage UX buffers; Arc-deployed manager address

## ADR-0006 — PositionManager NFT LP path (O08)

- **ID/date/owner:** ADR-0006 / 2026-09-07 / pairband-build
- **Question:** How do makers seed/exit option/USDC liquidity?
- **Decision:** Use pinned Uniswap v4 `PositionManager` + Permit2 Action planner (`MINT_POSITION` / `DECREASE_LIQUIDITY` / zero-liq collect + `CLOSE_CURRENCY`). Do not invent pooled share accounting. Maker free inventory stays separate from vault `accountedUSDC`. Post-cutoff adds blocked by hook; decrease/collect remain allowed.
- **Source/evidence:** docs/evidence/o08/, `PositionManagerE2E.t.sol`
- **Unresolved:** Arc-deployed POSM address; official Uniswap listing

## ADR-0007 — Independent ghost invariants (O09)

- **ID/date/owner:** ADR-0007 / 2026-09-07 / pairband-build
- **Question:** How to check vault conservation without trusting contract formulas alone?
- **Decision:** Maintain a Solidity twin of the O02 `SeriesAccountingModel` as a ghost, drive multi-actor Foundry invariant sequences across two series, and keep a threat register with Slither triage. Donations tracked separately from accounted reserves. Green local suite is **not** an audit.
- **Source/evidence:** docs/evidence/o09/
- **Unresolved:** External review (O28); Arc-specific runtime (O10)
