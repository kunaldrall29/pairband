# Pairband — Complete Build Plan

**Version:** 1.0  
**Date:** 9 September 2026  
**Status:** Pre-mainnet  
**Target chain:** Circle Arc  
**Site:** [pairband.com](https://pairband.com)

PRODUCT · ENGINEERING · DESIGN

One sentence: Pay or convert listed stables as if they were bank wires. Uniswap on Arc does the pair. Circle rails bring USDC from other chains. A price band decides whether the payment is allowed to leave.

---

## 1. Purpose of this document

This is the single source of truth for building Pairband. It replaces the previous landing-page thesis (EURC put options written against USDC and traded as Uniswap v4 tokens). That product is retired. Pairband is now a payout, convert, and team-cash product.

Use this document in build mode. Do not invent extra tabs, tokens, yield numbers, or chain pickers. If a protocol is not listed as required for a phase, it is out of scope.

---

## 2. Product definition

### 2.1 What Pairband is

Pairband is software that lets a person or a team send a known amount of money to a known counterparty, in the currency that counterparty asked for, with a receipt a finance person can audit.

- **Pay** — exact-out payout to an address or saved payee, with an onchain memo.
- **Convert** — same engine, no recipient. Rebalance USDC and EURC inside the band.
- **Workspace** — org, roles, limits, payees, activity export. Not a bank.

The Uniswap v4 hook is not a user-facing product. It is the later implementation of atomic swap + pay + memo.

### 2.2 What Pairband is not

- Not a Uniswap frontend.
- Not Circle StableFX (that API is KYB / institution-only).
- Not a consumer wallet competing with Pulsar.
- Not a yield farm, launchpad, options venue, or prediction market.
- Not a custodian. Pairband never holds user funds in v1.
- Not an INR rail. No rupee on the homepage.

### 2.3 Who it is for, in order

| Priority | User | Job they already have |
|---|---|---|
| P0 | Crypto-native operator / founder | Pay a contractor in USDC or EURC this week |
| P1 | Small team finance / ops | Same payments, with roles, limits, CSV |
| P2 | Market maker / LP | Seed USDC/EURC depth so Pairband routes can fill |
| P3 | Agent / automated payer | Same Pay API; not the company thesis |

### 2.4 Why Arc and Uniswap, not Base

- Gas and value are the same unit: USDC. No spare ETH for gas.
- Deterministic sub-second finality. Receipt can say settled without 12-block hedging language.
- Native EURC and transaction memos exist on Arc.
- CCTP / Gateway / App Kit Unified Balance pull USDC from other chains into one spendable number.
- Uniswap supplies the open pair StableFX will not serve (invoices and long-tail size).

If those properties are not used in a screen, the screen does not belong on Pairband.

### 2.5 Hard product rules

1. One primary action: Pay. Convert and Workspace support it.
2. Exact-out. They receive a fixed amount. You spend whatever the band allows.
3. If the band cannot be filled, nothing leaves the wallet. A preview is not a fill.
4. UI words: Pay, Convert, Cash, Activity, Band, Reference. Never swap, pool, hook, tranche, APY at launch.
5. List a pair only after mainnet mint and measured two-sided depth.
6. Do not sum cash, pool TVL, and lending deposits into one number.

---

## 3. Decisions log

| Decision | Choice | Why |
|---|---|---|
| Chain | Arc mainnet (`5042`). Testnet `5042002` for rehearsal only. | USDC gas, memos, EURC, Circle interop. |
| Custody | Non-custodial. User or team wallet signs. | Avoid MSB / PSP in v1. |
| FX venue | Uniswap v3 first, v4 hook later. | v3 is boring and live. Hook is complexity. |
| First pair | USDC/USDC pay + USDC↔EURC convert. | Only pair with a realistic launch book. |
| StableFX | Do not integrate. | Permissioned. Wrong customer. |
| Aave / Morpho | P3 only, after live + same-session withdraw. | Not required for Pay. |
| Aerodrome | Ignore until it has the listed pair. | Logo is not liquidity. |
| Yield on marketing | Forbidden at launch. | Honesty. No APY to show. |
| INR / fiat out | Out of v1. | No licensed off-ramp. |
| Token | None. | Software fee on convert, not a protocol token. |
| Landing visual | Keep pairband.com design system. | Logo, cream, ink, gold chip stay. |
| Old options product | Dead. | Does not pass the use-it-this-month test. |

---

## 4. Design system

Do not restyle pairband.com. Rebuild content inside the existing visual language.

### 4.1 Tokens (match live site)

| Token | Value | Use |
|---|---|---|
| Page canvas | Warm cream (`#F6F1E8`) | Full page background |
| Ink / headline | Deep forest (`#1A3A34` / `#1B3D38`) | H1, body, buttons |
| Muted body | Warm gray-green (`#5C6B66`) | Supporting copy |
| Banner | Dark teal bar | Product preview strip |
| Chip | Gold / sand pill (`#C4A35A`) | Illustrative example |
| Card | White, 16–20px radius, soft shadow | Hero quote card, feature cards |
| Primary CTA | Filled dark pill, cream label | Join early access, Pay |
| Secondary CTA | White pill, ink border | See how it works |
| Type | Geometric sans + existing display serif if already used | Do not introduce a third family |

### 4.2 Voice

- Precise, short, slightly formal.
- No hype, no points, no APY on the product UI.
- Refuse loudly. “No executable route” and “Quotes unavailable” are allowed. “0 USDC” as a fake quote is not.

### 4.3 Product UI screens

Cash · Pay · Convert · Activity · Payees · Workspace · Receipt — plus empty, loading, band-fail, wallet-reject, RPC-down, issuer-restriction as first-class states.

---

## 5. What will be made

| Repo path | Contains |
|---|---|
| `apps/web` | Next.js 15 landing + app |
| `apps/api` | Waitlist, quotes, receipts |
| `packages/config` | Arc address book |
| `packages/domain` | Band math |
| `packages/contracts` | Optional Pay helper / later hook |
| `docs/` | This plan + decisions |

### Landing

Same layout language as pairband.com. Sections: Banner → Nav → Hero + quote card → Three ways → What actually happens → Pairs → Two jobs → Built on → What can go wrong → Questions → Early access. Only conversion: Join early access.

### Application

Authenticated app at `/app`. Wallet is the account in P0.

### Contracts

P0: no custom contract required (router + Memo + transfers). Thin multicall allowed. Never hold user funds.

### Off-chain

Postgres later for orgs. P0 API may use in-memory stores for rehearsal. Waitlist on landing.

---

## 6–8. Architecture summary

Signed-intent app: browser builds tx, wallet signs, Arc executes. Servers never have withdrawal rights.

Pay flow: collect → quote exact-out → band check → transfer+memo or convert+transfer → wait finality → receipt. Never show pending as settled.

Quote engine: QuoterV2 exactOutput when bound; refuse if mid sources disagree or Quoter missing. Quote TTL seconds. Fee 0 same-asset; 10–30 bps convert shown before sign.

Auth: SIWE in P1; wallet connect in P0.

---

## 9. Building flow

### Phase 0 — Rehearsal on Arc testnet (now)

- Landing copy. Wagmi `5042002`. Transfer + Memo. Stub FX if no pool. **Kill:** cannot show receipt with memo id.

### Phase 1 — P0 mainnet week 1

Cash + Pay USDC + memo + Activity + early access. EURC only after measured fill. **Kill:** cannot beat Wise on time-to-settled for $1k USDC, or advertise FX when worse than 20 bps.

### Phase 2 — Workspace · Phase 3 — Hook · Phase 4 — Idle cash

As in product brief. Do not start hook while Pay USDC unfinished.

### Build order inside a phase

1. Copy and IA frozen. 2. Chain config. 3. Quote engine with refuse. 4. Pay USDC. 5. Receipt + Activity. 6. Convert. 7. Workspace. 8. Hook.

---

## 10. Landing copy (binding)

**Banner:** Product preview · Figures on this page are illustrative. Nothing here is executable.

**Eyebrow:** Stablecoin pay and convert on Arc

**Headline:** Pay the amount they asked for. Stay inside your band.

**Body:** Send USDC or EURC like a wire. If they need a different stable, Pairband converts through Uniswap and delivers the exact amount — with an invoice memo finance can audit. Gas is USDC. Settlement is final in under a second.

**Buttons:** Join early access · See how it works

**Hero card:** Pay 10,000.00 EURC · Illustrative example · Recipient / They receive / You spend / Price band / Reference · CONDITIONAL PAY footer.

SEO title: Pairband — Pay and convert stables on Arc

If landing copy and this plan conflict, this plan’s product rules win.

---

## 11. Fees, legal, positioning

Non-custodial interface. Band is a cap, not a mid promise. Disclosures: freeze, depeg, contract risk, no audit until true, not StableFX, not a bank. No claimed Circle partnership.

---

## 12. Test plan

Unit: band math, quote expiry, allowlist. Fork: exact-out + memo. UX: band fail does not pop wallet. Ops: disable EURC from config. Load: fail closed on RPC failure.

---

## 13. Open items (do not block P0)

Mainnet RPC/explorer/token/Memo addresses · public USDC/EURC pool at genesis · paymaster · Safe/Fireblocks demand · fee entity jurisdiction.

---

## 14. Definition of done for v1

A team of two can fund USDC, pay exact USDC or EURC inside a band, attach `INV-1042`, export CSV, explain every row. If EURC depth missing, USDC pay works and EURC is hidden. No token. No APY. No options.

---

**Implement P0 in this order only:** landing copy → chain config → Pay USDC + memo → receipt → banded EURC only if the pool can fill.
