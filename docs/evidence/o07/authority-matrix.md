# O07 router authority matrix

| Check | Behavior |
| --- | --- |
| Payer / recipient | Always entry `msg.sender` |
| Unlock auth | Stored `_ctx` before `unlock`; callback ignores forged payer bytes |
| Manager only | `unlockCallback` reverts unless `msg.sender == poolManager` |
| msg.value | Payable entrypoints revert `NativeValueNotAllowed` if nonzero |
| Buy | Exact-out options; USDC paid ≤ max; partial option credit reverts |
| Sell | Exact-in options fully consumed; USDC ≥ min; partial input reverts |
| Phase / pause | Trading phase + `!newRiskPaused` required at entry (hook also gates) |
| Residual | Router ERC-20 balances and currency deltas must be zero after settle/take |
