# Build status

Product: Pairband options-v2.

**Readiness labels (honest):** dual-track work ≠ merged product ≠ audited ≠ Arc lifecycle verified ≠ funded pilot ≠ mainnet ≠ ETHGlobal submitted.

Work proceeds on **two branches**. Do not treat either alone as the full Gate1+Gate2 story.

## Track A — protocol / docs (`cursor/options-v2-bootstrap-4c19` tip)

| Stage | Status | Evidence | Notes |
| --- | --- | --- | --- |
| O00–O05 | complete (local) | `docs/evidence/o00`–`o03` | Vault lifecycle |
| O06–O09 | complete (local) | `docs/evidence/o06`–`o09` | Hook, router, POSM E2E, invariants — **not an audit** |
| O10 | **partial** (dry-run) | `docs/evidence/o10/` | Broadcasts **pending authorization**; no invented tx hashes |
| O28 | **partial** (prep) | `docs/review/`, `docs/evidence/o28/` | Review bundle + readiness ledger; **no audit badge** |
| O30 | **stub** | `docs/ethglobal/` | Draft only — **not submitted** |

## Track B — API / UI (`cursor/api-ui-foundations-4c19` tip)

Evidence lives on that branch (not fully present on bootstrap). Recorded there as:

| Stage | Status (per api-ui evidence) | Evidence (on api-ui) | Notes |
| --- | --- | --- | --- |
| O11, O16, O17 | complete (local/preview) | `docs/evidence/o11`, `o16`, `o17` | Preview shell / landing; no live markets |
| O12 | complete (local fixtures) | `docs/evidence/o12/` | Fixture/Anvil labeled; Arc live opt-in |
| O13 | complete (local/fixture) | `docs/evidence/o13/` | Quotes `executable:false` in fixture/preview |
| O14 | partial | `docs/evidence/o14/` | Educational fixtures |
| O15 | stub | `docs/evidence/o15/` | Email disabled |
| O18 | complete (preview/fixture UI) | `docs/evidence/o18/` | Protect flow; funded buy blocked without verified deploy |

## Cross-cutting blockers

| Claim | Status |
| --- | --- |
| Professional security audit | **Not done** (O28 prep only) |
| Independent review | **Not done** |
| Funded pilot / Gate4 | **Blocked** |
| Mainnet / Gate5 | **Blocked** (mainnet null) |
| Official Uniswap on Arc | **Absent** |
| Arc testnet lifecycle verified | **Blocked** (O10 no broadcast) |
| ETHGlobal submission | **Not submitted** |

Optional O24/O25/O32: disabled.

See `docs/review/readiness-ledger.md` (protocol tip) and api-ui `docs/BUILD_STATUS.md` for track-local detail.
