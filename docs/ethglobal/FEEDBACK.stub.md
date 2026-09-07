# Uniswap FEEDBACK.md (STUB)

**Draft only. Form not submitted. Public repo publication not performed from this stage.**

## Integration observations (concrete)

1. **Official v4 deployments absent on Arc** — forced Pairband-deployed `PoolManager` labeling; cannot claim Uniswap-operated infrastructure on Arc.
2. **Hook permission mining** — CREATE2 flags `(beforeInitialize|beforeSwap|beforeAddLiquidity)` via `HookMiner`; verify address bits at deploy.
3. **Narrow router vs Universal Router** — product uses `PairbandRouter` exact-out buy / exact-in sell with stored unlock payer context; Universal Router / Trading API not used for option tokens.
4. **PositionManager on Arc** — periphery POSM expects WETH; Arc has no WETH (native USDC is IERC20). Local POSM E2E works; Arc POSM deferred pending stub/descriptor plan.
5. **Quoter pattern** — `PairbandQuoter` returns via eth_call revert payload; not a price guarantee; resimulate before sign.
6. **Lifecycle hook value** — enforces series registration, phase, and new-risk pause on init/swap/add without moving collateral; does **not** guarantee liquidity or fair premium.

## Ask for Uniswap / docs teams (optional)

- Guidance for chains without listed v4 deployments but with community self-deploy  
- POSM patterns when native gas token is already ERC-20 (no WETH)

## Submission checklist (external actions)

- [ ] Public open-source repo push (authorized)  
- [ ] Paste this FEEDBACK into required form (authorized)  
- [ ] Video / presentation upload (authorized)  

Unchecked = not done.
