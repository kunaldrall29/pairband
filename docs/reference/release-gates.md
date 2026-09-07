
# Release, business and demonstration gates

Status words: proposed, implemented, tested-locally, verified-testnet, independently-reviewed, approved-for-pilot, released. A later status needs evidence; dates do not promote it automatically. Store owner, evidence path/URL, commit, environment and last verified date for each gate.

## Gate0 — viable dependency path
Verify Arc network/configuration, USDC/EURC bytecode/decimals, v4 core/periphery/router compatibility, code licenses and usable quoting. Resolve 6-decimal option units in pool math. If official Arc deployments are absent, prepare a labeled testnet instance only after license/source review. Unsupported deployment is a blocker, not a copied address from another chain.

## Gate1 — correct local product
Independent integer model, stateful invariant tests, all lifecycle boundaries, exact-output/exact-input full-fill checks, immutable terms, reserve/fee separation and LP exit tests pass. No placeholders remain on the critical path. API/indexer/wallet UI show observed facts and error states.

## Gate2 — genuine Arc testnet slice
Deployed verified contract addresses, real mint/buy/exercise/redeem/LP-exit receipts, working frontend/backend, diagram, repeatable README and documented failure recovery. Arc-specific behavior tested through Arc RPC. No public testnet time warp. Separate preview, mocked test and actual chain evidence.

## Gate3 — economic/customer evidence
Interview and observe a small defined cohort of EURC users, writers and a specialist options maker. Record actual needs, time horizon, acceptable premium, alternatives and repeat behavior. Secure maker quote/inventory commitments rather than infer liquidity from a deployment. Benchmark spread/slippage/depth, writer and LP P&L, subsidy dependence, expiry exercise rate, customer acquisition and operational cost. Testnet usage is not revenue.

Protocol revenue model keeps issuance fee, writer premium, LP fee, maker P&L and promotional spend separate. A fee cap is not pricing validation. A token emission program is not the business model. Investor/grant package must state evidence, risks and the exact ask. Arc's published structured-product interest supports category alignment, not a named RFP acceptance.

## Gate4 — funded pilot readiness
Independent contract review; critical/high findings closed at reviewed commit; dependency provenance/license clearance; legal advice on actual jurisdictions/customer eligibility and derivatives/venue roles; approved terms/disclosures; maker capital plan; monitored reserve reconciliation; RPC failover; expiry availability drill; backup restore; signer separation; secrets scan; verified manifest and recovery UI; documented limited caps and incident authority. No claims of audit or regulatory approval without scope and evidence.

## Gate5 — mainnet release
Official mainnet chain/RPC/token/core/periphery verification, full environment-specific simulation, immutable configuration review, pilot eligibility and deployment authorization, published verified addresses and runbooks, monitored first transactions with actual users/capital limits. Contract/website deployment, DNS changes, public GitHub push and feedback form submission are external actions and require existing authorization. Prepare reviewable payloads first. Missing gates keep the product in testnet with explicit blockers, including on September 30.

## ETHGlobal evidence without changing product scope
Read current event requirements and pool rules. Preserve/document pre-existing work and AI assistance as required. Arc: working frontend/backend, diagram, repo, video/presentation; launch track's September 30 readiness evidence. Uniswap: public open-source repository, FEEDBACK.md, actual developer feedback form completion, README code links. Verify source license before publication. Only claim The Graph if live provider data and a meaningful qualifying implementation exist; querying a mock or adding a logo does not qualify. Do not assume eligibility pool or prize selection from this pack.

Demo storyboard: explain dated EURC need; show writer locks backing and receives two claims; show separate LP inventory; buy exact options; show deadline and hypothetical payoff; show actual exercise in a legitimate short/precreated window; redeem writer mixed reserves; demonstrate LP exit and lifecycle rejection. Keep actual receipts visible. No altered reference feed presented as a live EURC crash. Record a clear human explanation and comply with current video requirements. The product can be compelling without optional agent/bridge/Graph work.

## Staffing and deadline planning
Suggested responsibilities: protocol engineer owns economics/contracts; full-stack engineer owns indexing/API/UI; founder owns users, maker partnerships, legal and proposal; independent reviewer owns review. One person may cover roles but should not claim an independent review of their own code. A solo build should prioritize O00–O23/O26 and defer optional stages; a secure real-money release can require more time than the event. September 30 is a target, not guaranteed feasibility.


---
