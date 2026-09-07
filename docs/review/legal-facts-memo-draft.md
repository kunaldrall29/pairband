# Jurisdiction / customer facts memo (DRAFT for counsel)

**Not legal advice. Not a license clearance. Not Terms approval.**  
Ask counsel for derivatives / venue / solicitation / eligibility / privacy conclusions through the team's normal legal process.

## Product facts (technical)

1. Pairband offers **dated EURC put options** economically: buyers may deliver EURC for fixed USDC during `[exerciseStart, exerciseEnd)`.
2. Writers lock **full USDC exercise backing** in a nonupgradeable per-series vault and receive **long tokens + writer receipts**.
3. Matched cancel before exercise returns backing only; issuance fee (if any) is not refunded.
4. Secondary market: Uniswap v4-style pools of **long token ↔ ERC-20 USDC** via Pairband hook/router (Pairband-deployed manager on Arc if/when broadcast).
5. LP inventory is **separate** from vault backing.
6. Operator powers: curated series listing, issuance fee recipient (immutable per series), **new-risk pause** only — no seizure of accounted reserves, no upgradeable proxy on vault.
7. Custody: users self-custody EOAs; no central user-tx signing service.
8. Website/app: preview and testnet modes; financial actions blocked when manifest `verified:false` or mode `preview`.
9. Intended demo users: builders / hackathon / testnet experimenters — **not** asserted retail offering in any jurisdiction.
10. Distribution: open-source Apache-2.0 repo; public publication/submission are separate authorized steps.

## Questions for counsel (do not answer here)

- Is this a security, derivative, or other regulated product in target jurisdictions?
- Venue / solicitation constraints for website access and testnet demos?
- Eligibility / geo blocking requirements?
- Privacy policy obligations for API/worker logs and email (email currently disabled)?
- Whether “Pairband-deployed Uniswap instance” labeling is sufficient for marketing claims?

## Documents pending counsel

- Terms of use, risk disclosure, privacy policy — **drafts only**, not approved.
