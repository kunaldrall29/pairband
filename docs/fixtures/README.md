
# Fixture provenance

All values in this directory are synthetic accounting/payoff examples, not prices, TVL, receipts or deployed series. Small integer timestamps test boundaries only. Never load these into a mainnet view or label them live. The fee fixture tests nonzero separation; it does not set commercial pricing. The dust example uses raw token units, not whole displayed options. Domain and contract tests must compare against these values plus an independently implemented stateful model.

Run `python3 fixtures/verify_accounting.py` from the kit root to validate example arithmetic and 2,000 randomized allocation/conservation sequences. It independently compares cumulative allocation with carried-remainder arithmetic. This validates the proposed specification, not Solidity implementation, Arc runtime behavior or security review.


---
