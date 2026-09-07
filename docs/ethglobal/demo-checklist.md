# Demo / video checklist (STUB)

**Not recorded. Not uploaded. Not a submission.**  
Use this as a shot list when authorized to film. Prefer real receipts; otherwise label **local forge / fixture**.

## Narrative (≤3–5 min)

1. **Need:** dated EURC exposure — put-style right to sell EURC for fixed USDC.  
2. **Write:** mint → show vault `accountedUSDC`, long + receipt balances (backing ≠ LP).  
3. **Make:** seed pool with **separate** inventory; show writer receipt unchanged.  
4. **Buy:** exact-output options; show USDC in / longs out; full-fill or revert.  
5. **Cutoff:** attempt swap/add after `exerciseStart` → blocked; LP decrease succeeds.  
6. **Exercise:** deliver EURC in window; show USDC out (no fake FX oracle shock).  
7. **Redeem:** after maturity, writer redeems mixed reserves.  
8. **Honesty beat:** “Not audited; Pairband-deployed v4 instance; mainnet null.”

## On-screen evidence rules

| Allowed | Forbidden |
| --- | --- |
| Real forge traces / Arc tx hashes you own | Invented hashes or “mainnet live” |
| Fixture quote UI with `executable: false` | Calling fixture quotes “live premium” |
| Illustrative payoff slider labeled hypothetical | Presenting slider as settlement mark |
| Pairband-deployed manager label | “Official Uniswap on Arc” |

## Pre-roll checklist

- [ ] Branch/commit SHA shown  
- [ ] `PAIRBAND_MODE` / manifest mode shown if UI demo  
- [ ] No `--private-key` / secrets on screen  
- [ ] License Apache-2.0 mentioned if required by event  
- [ ] AI assistance disclosed if required  

## Blockers (current)

- O10 Arc lifecycle receipts: **broadcast pending**  
- O30 event form / repo publish / video host: **not authorized in this stage**  
- O19+ earn flows: may be incomplete depending on tip  

## September 30 readiness (honest)

Target date ≠ feasibility. Open gates: audit, legal, maker capital, O10 broadcast, submission auth. See `docs/review/readiness-ledger.md`.
