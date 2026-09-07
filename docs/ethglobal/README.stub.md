# Pairband options-v2 — ETHGlobal README (STUB)

**Status: draft stub. Not a submission. Not published as the contest README.**  
Do not treat this file as form completion or video upload.

## One-liner

Dated EURC put options on Arc: writers lock USDC backing; buyers trade option tokens on a Pairband-deployed Uniswap v4 test instance; physical exercise and writer redemption complete the lifecycle.

## Honesty labels (must remain)

- Not audited  
- Official Uniswap v4 **not listed** on Arc — any manager is **Pairband-deployed**  
- Arc contract addresses: **pending broadcast** (see `deployments/arc-testnet.json`, `verified: false`)  
- Local Anvil ≠ Arc Osaka  

## Setup (local)

```bash
pnpm install
pnpm --filter @pairband/domain test
cd packages/contracts && forge test
```

Env: copy `.env.example`. Keep `PAIRBAND_MODE=preview` until a verified manifest exists.  
**Never** set `PAIRBAND_ALLOW_BROADCAST=1` without operator authorization.

## Architecture

See `docs/review/architecture-map.md`.

## Demo storyboard (when Arc receipts exist)

1. Writer mints backed options (show vault USDC + dual claims)  
2. Separate maker LP inventory  
3. `buyExactOutput` full fill  
4. Trading cutoff blocks swap/add; LP can still decrease  
5. Exercise with EURC in window  
6. Writer redeem after maturity  

Until O10 broadcast: demo from **local forge** / recorded fixtures only — label clearly.

## AI assistance

Built with AI coding agents; humans remain responsible for review and submission accuracy.

## Known limitations

See `docs/review/known-limitations.md`.
