# Pairband internal security & verification report

**Date:** 9 September 2026  
**Scope:** `cursor/pairband-pay-rebuild-4c19` (Pairband pay/convert rebuild)  
**Classification:** Internal agent review + automated tests + Arc testnet read-only probes  

> **This is not a professional third-party security audit.**  
> No audit firm engagement, no formal attestation, no audit badge.  
> Findings below are from code review, automated suites, and public RPC checks.

---

## Executive summary

| Area | Verdict |
|------|---------|
| Unit / typecheck / web build | Pass |
| Security + functional API suite | **16/16 pass** (cookie session + event decode + pay-authorize) |
| Arc testnet live (read-only) | **6/6 pass** |
| Wallet-broadcast Pay on faucet funds | **Not executed** (no funded test key in CI) |
| External audit / mainnet readiness | **Not claimed** |

Several **high** issues were found and **fixed in this pass** before re-test.

---

## Critical / high findings (remediated)

| ID | Severity | Finding | Fix |
|----|----------|---------|-----|
| S1 | Critical | `POST /v1/receipts` was unauthenticated — anyone could forge `settled` rows | Requires SIWE session; payer must match session |
| S2 | Critical | UI marked payment `settled` on tx hash alone (before inclusion / success) | Wait for `waitForTransactionReceipt`; server verifies Memo target + success via RPC before `settled` |
| S3 | High | `GET /v1/activity` dumped all receipts without auth | Requires session; scoped to payer or org membership |
| S4 | High | CORS `origin: true` with credentials | Allowlist via `ALLOWED_ORIGINS` |
| S5 | High | SIWE domain taken from `Host` header (spoofable) | Fixed domain `PAIRBAND_AUTH_DOMAIN` |
| S6 | Medium | Auth/DB errors crashed the Node process | try/catch on verify; schema migration repaired |

## Medium findings (remediated in follow-up pass)

| ID | Severity | Finding | Fix |
|----|----------|---------|-----|
| O1 | Medium | Session token in `localStorage` + `x-session-token` header | HttpOnly cookie only; Next.js `/api` rewrite; no token in verify JSON |
| O2 | Medium | Onchain verify did not decode Transfer/Memo events | `verifyPayTransaction` decodes USDC Transfer + Memo event vs expected payee/amount/reference |
| O3 | Medium | Spend limits only on receipt write | `POST /v1/orgs/:orgId/pay-authorize` + PayForm checks before wallet prompt |

## Remaining risks (accepted / open)

| ID | Severity | Notes |
|----|----------|-------|
| O4 | Medium | No CSRF token on cookie session (mitigated by SameSite=Lax + allowlisted CORS). |
| O5 | Low | Rate limits are in-memory (not shared across replicas). |
| O6 | Info | EURC/Uniswap absent on Arc testnet — convert correctly refuse-closed. |
| O7 | Info | Live Memo pay broadcast not run without faucet-funded EOA in this environment. |

---

## Functional results

### Quotes / band
- USDC→USDC quote executable, TTL set, fee 0  
- USDC→EURC returns `pair_disabled` / “This pair is not listed” (never “0”)  
- Band-check refuses over-band fills (domain math aligned)

### Workspace
- SIWE nonce → verify → create org → invite payer with limit → save payee: **pass**

### Receipts
- Unauthenticated forge: **401**  
- Authenticated fake hash as settled: **409 `not_settled_onchain`**

### Activity
- Unauthenticated list/CSV: **401**

---

## Arc testnet real-world (read-only)

| Check | Result |
|-------|--------|
| `eth_chainId` | `0x4cef52` (5042002) |
| Memo `0x5294…e505` bytecode | Present (~1228 bytes) |
| USDC / EURC | 6 decimals, code present |
| Multicall3From | Code present |
| Calldata selector `memo(address,bytes,bytes32,bytes)` | `0xc3b2c4f8` matches builders |
| Empty `memo` eth_call | Reverts (`MemoFailed`) — contract live |
| Uniswap V3 at Ethereum factory addresses | **No code** — FX correctly disabled |

---

## How to reproduce

```bash
export DATABASE_URL=postgres://pairband:pairband@127.0.0.1:5432/pairband
export ALLOWED_ORIGINS=http://localhost:3000
export PAIRBAND_AUTH_DOMAIN=localhost:3000
pnpm db:migrate
pnpm --filter @pairband/api start &
cd apps/api && PAIRBAND_API_URL=http://127.0.0.1:3001 pnpm exec tsx --test \
  src/security-functional.test.ts src/arc-live.test.ts
```

Wallet E2E (manual): faucet Arc testnet USDC → Workspace SIWE → Pay → confirm Memo tx on ArcScan → Activity row `settled`.

---

## Agent review cross-check

An independent security-review pass flagged the same high-priority items (open activity, unauthenticated receipts, premature settled, CORS, SIWE Host binding, spend limits). Those were remediated in commit `b5d0844`. Follow-up pass closed cookie-only sessions, event-level onchain decode, and pre-wallet spend authorization.

---

## Recommendation

Ship testnet rehearsal with current hardenings. Engage an **external auditor** before any hook that moves size or before marketing “audited.” Do not enable EURC until Quoter + measured depth exist.
