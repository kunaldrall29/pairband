# Decisions

## ADR-0001 — Retire options product; Pairband is pay / convert / workspace

- **Status:** Accepted (2026-09-09)
- **Context:** The EURC put / Uniswap v4 options thesis does not pass the use-it-this-month test.
- **Decision:** Delete options protocol, Protect/Earn/Markets options UI, and related prompts. Pairband is exact-out payouts and converts on Arc.
- **Consequences:** Greenfield rebuild from `main`. Source of truth: `docs/PAIRBAND_BUILD_PLAN.md`.

## ADR-0002 — Non-custodial; no fake audit or mainnet readiness

- **Status:** Accepted
- **Decision:** Pairband never holds user funds in v1. No audit badge until a real report exists. Arc mainnet (`5042`) addresses bind only when Circle publishes them; rehearsal uses testnet `5042002`.
- **Consequences:** P0 ships Pay USDC + memo on testnet; EURC routes stay hidden until measured depth.
