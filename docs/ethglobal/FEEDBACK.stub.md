# Uniswap FEEDBACK.md (STUB)

**Draft only. Developer feedback form not submitted. Public repo publication not claimed from this file.**

File intended for form “link to FEEDBACK.md” field once a public URL exists:  
`docs/ethglobal/FEEDBACK.stub.md` (rename to `FEEDBACK.md` only when publishing).

## What we built against Uniswap v4

- Lifecycle **hook** with mined CREATE2 permission bits for `beforeInitialize` / `beforeSwap` / `beforeAddLiquidity`.  
- **Narrow router** (`buyExactOutput` / `sellExactInput`) with unlock-context payer binding — not Universal Router.  
- Local **PositionManager** Action-planner E2E against the hook; Arc POSM deferred because Arc has **no WETH** (native USDC is already IERC20).  
- Quoter via **eth_call revert payload** — resimulate before sign; not a price guarantee.

## Integration friction (constructive)

1. **No official v4 deployment listing on Arc** → self-deploy must be labeled; docs could clarify community-deploy expectations.  
2. **POSM ↔ chains without WETH** → clearer periphery guidance when gas token is already ERC-20 would help.  
3. **Hook + sparse liquidity** → exact-output full-fill UX needs explicit depth checks; partial fills correctly revert in our router.  
4. **Multicall3From (Arc)** → sender preservation matters for router `msg.sender` payer binding; indexers must attribute EOAs through CallFrom routes.

## What we are not claiming

- Official Uniswap-operated pools on Arc  
- Audit or mainnet readiness  
- Graph/Circle optional tracks without separate evidence  
- Form completion or prize eligibility

## Submission checklist (external)

- [ ] Publish open-source repo (authorized)  
- [ ] Submit feedback form with this file’s URL (authorized)  
- [ ] Attach demo video if required (authorized)  

Unchecked items are **not done**.
