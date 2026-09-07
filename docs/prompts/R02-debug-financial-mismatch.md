
# R02 — Debug a financial mismatch

Freeze submission for the affected flow in the local investigation and inspect actual evidence: chain/deployment identity, series terms, raw quantities, receipt/events, pool ordering, signer/account, quote limits, token balances, accounted reserves and indexer block/hash. Preserve the failing transaction/seed and user funds; do not patch displayed numbers to hide the mismatch.

Classify the cause:6-versus18USDC units,100 EURC multiplier, raw/whole option units, sorted pool price inversion, duplicate system/token logs, stale quote/indexer, partial fill, fee/collateral mixing, receipt-versus-long confusion, snapshot rounding, donation, expired phase or unknown transaction outcome. Reproduce in the smallest relevant environment. Arc-specific behavior needs Arc evidence, not only Anvil.

Fix the responsible contract/domain/API/UI layer, add a meaningful regression case and reconcile the independent model. Review downstream claims/copy if economics changed. Never silently alter issued terms or authorize a compensating financial action. Report root cause, user impact, changed files, verified correction and any required incident/release response.


---
