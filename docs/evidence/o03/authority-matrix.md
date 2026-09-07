# Authority matrix — SeriesFactory / SeriesVault (O03–O05)

| Actor | Can | Cannot |
| --- | --- | --- |
| Factory owner | createSeries; setNewRiskPaused | Change issued terms; seize collateral; mint unbacked; block exercise/redeem/cancel |
| SeriesVault | mint/burn claim tokens; hold accounted USDC/EURC | Upgrade; sweep donations; arbitrary recipient; pause exits |
| Long holder | transfer; exercise in window | Writer redemption; cancel without matching receipt |
| Receipt holder | transfer; cancel (with long, trading); redeem after maturity | Exercise |
| Anyone | finalize after maturity; read state | |

No proxy, no delegatecall executor, no collateral rescue, no public long burn.
