
# Pairband repository guidance

Merge these project rules into existing instructions; do not overwrite unrelated instructions or weaken permissions. Read docs/MASTER_CONTEXT.md and docs/reference/protocol.md before economic changes. Active design is options-v2. Old payment-flow and spot-band code is migration input only.

Use existing approved stack where compatible; pin dependencies and verify official sources. Preserve user work. Financial amounts use bigint/string; one whole long/receipt token has 6 decimals and covers100 EURC. Keep collateral, long claims, writer receipts and LP inventory separate. Phase transitions come from chain time; exercise and redemption cannot depend on the backend/Graph/reference feed. No native/ERC20USDC double counting.

Run one requested stage, satisfy prerequisites, implement functional paths and meaningful tests, then update docs/BUILD_STATUS.md and evidence. Do not claim tests/deployments/audits you did not execute or verify. Stop only the blocked portion; continue safe independent work. Do not deploy/send/publish without applicable existing authorization. No user private keys on the server, no secret logs, no invented API responses. Third-party source and SDK support must be verified, not inferred from sponsor names.

Changes to terms/units/fees/authority require an ADR and updated fixtures/UI copy. Mainnet fields remain null until verified. Existing claims must remain accessible across UI versions. A local test suite is not an independent security review.


---
