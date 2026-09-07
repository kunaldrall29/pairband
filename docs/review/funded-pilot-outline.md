# Limited funded pilot outline (DRAFT)

**Status:** planning artifact only. **Not approved-for-pilot.**

## Preconditions (all required)

- [ ] Independent review complete at frozen commit; critical/high closed
- [ ] O10 Arc lifecycle evidence with real receipts
- [ ] Legal facts memo answered by counsel for chosen jurisdictions
- [ ] Maker inventory/spread commitments in writing
- [ ] Signer separation: deployer ≠ pause admin ≠ maker ≠ web session keys
- [ ] Monitoring: reserve reconciliation, pause alerts, RPC failover
- [ ] Caps: max series notional, max writer units, fee policy documented
- [ ] Incident roles staffed; user recovery runbook (without rewriting claims)

## Proposed pilot shape (illustrative — not binding)

| Parameter | Draft |
| --- | --- |
| Network | Arc testnet only until Gate5 |
| Series count | Small (e.g. 1–3 short-dated) |
| Max writer units / series | Hard cap ≪ technical 1e12 |
| Issuance fee | Explicit bps ≤ code cap; disclose |
| Maker | Named specialist; inventory away from vault |
| Users | Allowlisted testers if counsel requires |
| Duration | Fixed calendar window |
| Shutdown | Pause new risk; honor exercise/redeem/LP exit |

## Scenarios to drill

- Network / RPC outage during exercise window
- USDC transfer restriction (blocklist) affecting a user
- Missed exercise by longs
- Thin pool / failed exact-output buy
- Compromised pause key (rotation plan)

## Non-goals

- Mainnet
- Permissionless global marketing
- Guaranteed yield or FX insurance claims
