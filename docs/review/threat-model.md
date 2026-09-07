# Threat model (O28 prep)

**Not an audit.** Extends `docs/evidence/o09/threat-register.md` with trust assumptions and residual risks.

## Assets

- Writer USDC backing locked in `SeriesVault`
- Long option tokens and writer receipts
- Maker/LP free inventory in v4 pools (separate from vault)
- Factory listing / fee recipient cashflows
- Deployer and pause keys

## Actors

| Actor | Goals | Capabilities |
| --- | --- | --- |
| Writer | Mint/cancel/redeem | Holds USDC + receipts |
| Buyer / long holder | Buy/sell/exercise | USDC or longs + EURC for exercise |
| Maker / LP | Earn spread; exit inventory | POSM or modifyLiquidity; not vault owner |
| Factory owner | Curate series; pause new risk | `onlyOwner` |
| Attacker | Unbacked mint, trap exits, steal backing, spoof pools | Public chain calls |
| Arc / Circle | Network rules, USDC blocklist | Protocol-level; out of Pairband control |

## STRIDE-style summary

| Category | Pairband-relevant examples | Mitigation status |
| --- | --- | --- |
| Spoofing | Fake pool registration; unauthorized hook callbacks | Hook `onlyPoolManager`; launcher-only register (O06/O09 tests) |
| Tampering | Unbacked ClaimToken mint | Vault-only mint/burn |
| Repudiation | Missing event indexing | Events emitted; O12 indexer prep — Arc attribution via Multicall3From noted |
| Information disclosure | Quoter as price guarantee | Documented non-guarantee |
| Denial of service | Pause trapping exits; post-cutoff LP stuck | Pause = new risk only; decrease allowed after cutoff |
| Elevation | Owner rescue/delegatecall | No rescue paths in `src/` (manual + O09); still needs external review |

## O09 coverage carry-forward

See threat register T01–T18. Local **covered** ≠ independently reviewed.

Residual / open for reviewer:

- T16 reentrancy findings (Slither) — triage, not closed by auditor
- T17 Multicall3From → router payer binding — needs live Arc tx after O10 broadcast
- T18 no official Uniswap Arc — Pairband-deployed PoolManager labeling mandatory
- Economic griefing / thin liquidity / adverse selection — O26/O27 **not done**
- Key compromise of factory owner or future deployer — operational, not proven by tests

## Invariants (local evidence)

- Ghost O02 twin matches vault counters under fuzz (256 runs / 128k calls)
- Long supply = writerUnits − exercisedUnits
- Receipt supply = writerUnits − redeemedUnits
- Accounted reserves ≤ token balances (donations may inflate balance)
- Fees paid to recipient, not mixed into accounted backing

## What this model does not cover

Arc Osaka opcode differences, blocklist value-transfer failures under load, production key ceremony, frontend phishing, and legal classification of the product.
