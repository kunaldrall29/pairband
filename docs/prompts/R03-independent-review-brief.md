
# R03 — Review the completed implementation

Review the specified commit against docs/reference/protocol.md and the build evidence. Inspect code independently; do not accept stage-complete labels as proof. Prioritize loss-of-funds, unauthorized spending, unbacked claims, expiry rights, LP exit, fee/reserve separation and data/transaction deception.

Trace each actor's assets through mint/cancel/buy/sell/exercise/redeem/LP flows. Check immutable terms, privilege boundaries, PoolManager callback context, allowance recipients, raw units, rounding, supported-token behavior, exact-output/full-fill enforcement, direct-contract recovery and configuration provenance. Confirm frontend previews match compiled ABI calls and no backend signer can spend user funds.

Run targeted tests where useful, record reproducible findings with severity, affected path, exploit/impact conditions and proposed mitigation. Separate verified defects from questions. Review does not authorize deployment or publication. If performed by the implementing assistant, label it an internal review; do not call it an independent professional audit. End with release-blocking findings and concrete evidence still missing.


---
