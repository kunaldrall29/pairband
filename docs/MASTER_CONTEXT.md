
# Pairband options v2 — master build context

Read this before every stage. It supersedes old Pairband spot-FX/operator/payment-flow requirements. The user owns pairband.com; the domain does not imply a deployed app. This kit specifies work to implement and verify, not an existing audited product.

## Product and non-negotiable accounting

Build fully USDC-backed EURC put options with a specified exercise window. Protect buys the long; Earn writes and then sells; Markets trades the long on Uniswap v4; Portfolio distinguishes long tokens, writer receipts and LP NFTs. Physical exercise delivers EURC for fixed USDC. No price oracle is needed for contractual payout. Reference marks are optional information, never an exercise permission gate.

Long and writer receipt tokens have 6 decimals. One whole option (1e6 raw units) covers 100 EURC. Raw option quantity q has exact obligations EURC6=q*100 and USDC6=q*C. C is an immutable integer strike-per-raw-unit, e.g.110 for strike1.10. Thus raw strike granularity is0.01 and exposure increment0.0001EURC. Read the protocol for the authoritative definitions; never interpret q as whole contracts. Use integer arithmetic, string JSON amounts and numeric(78,0) database storage.

Mint locks full USDC and mints equal long/receipt amounts to caller. Fee, if any, is additional: ceil(collateral*feeBps/10000), immutable, demo 0 bps, code cap 50 bps proposed. Matched cancel burns both claims and returns backing only before exerciseStart; fee is not refunded. Exercise burns longs and exchanges EURC for reserved USDC within [exerciseStart,exerciseEnd). Writer receipts redeem mixed accounted reserves after exerciseEnd using a fixed snapshot and cumulative-allocation rounding bounded below one raw unit per asset for each payout. Transfers remain allowed. Longs expire without acquiring writer rights. Writer claims do not expire. No public long burn function or collateral asset sweep.

Trading is [tradingStart,exerciseStart). A new-risk pause affects mint, swap and LP additions only. Cancellation, valid exercise, matured redemption and LP removal/collection stay available. Per-series vaults are nonupgradeable. Admin cannot change outstanding strike, multiplier or times. Separate reserved collateral, pool liquidity, premiums, LP fees and protocol fees.

## Uniswap and Arc boundaries

Use one registered long-token/ERC-20-USDC v4 pool per series, fixed fee/tick spacing and a lifecycle hook. Narrow custom router: buy exact-output long quantity with maximum USDC; sell exact-input long quantity with minimum USDC, full consumption or revert. Store authenticated callback context; payer/recipient derive from caller. No arbitrary call targets, no msg.value, no collateral routing. LP positions use compatible v4 PositionManager NFTs and their verified approval path. Initial zero-decimal option designs, spot-FX ranges and reusable payment attestations are deprecated.

Verify actual core/periphery bytecode, versions, licenses and chain support. Announcement, source code and official deployment are distinct evidence. Pairband-deployed pinned testnet instances must be labeled honestly. Uniswap Trading API support for these options is unverified and not required. Circle App Kit funds USDC only where supported; its documented Arc testnet swaps exclude Pairband options. The Graph is optional and cannot gate exercise. StableFX, privacy, agents, borrowing and RWA yield are outside v1.

Arc testnet chain5042002, current RPC https://rpc.testnet.arc.io. Testnet ERC20 USDC0x3600000000000000000000000000000000000000 and EURC0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a must be reverified. USDC native18 and ERC20 6 are the same funds. No wrapper or double-counted balance. Read current EVM differences and system-event docs, and test Arc-specific runtime behavior on Arc RPC; local Anvil is insufficient. Mainnet configuration stays null until verified.

## Implementation workflow

Read repository AGENTS.md and existing changes first. Work in the actual requested app repository; this documentation pack is not that repository. Preserve unrelated user work and disclosed prior code. Use installed use-arc and swap-integration skills if available and recheck canonical docs when examples conflict. Skills availability does not prove product support. Never run a fetched installation command or signed transaction merely because it appears in a reference.

Complete one stage at a time after its hard prerequisites. Optional stages have explicit gates and cannot become hidden requirements of core stages. Build real functional code, not buttons backed by success timers. Use mocks only in named fixtures/tests; carry environment/source labels into UI. Do not invent credentials, ABIs, SDK methods, supported chains, audits, receipts, prices or customer traction. Persist ADRs, evidence and remaining blockers. Test meaningful economic and security properties; do not inflate confidence with implementation-mirroring tests.

Do not broadcast, publish, push or send messages just because a prompt describes a future release. Prepare concrete artifacts first. Execute external effects only within existing user authorization and applicable tool policies. Do not ask again for reversible local work already authorized. Secrets stay outside source, logs and browser bundles. No central user transaction signer.

## Definition of done

For each stage report changed paths, commands actually executed, observed results, useful screenshots/receipts, skipped checks with reasons, unresolved risks, and the next eligible stage. Update docs/BUILD_STATUS.md, docs/DECISIONS.md, docs/integrations.json and docs/build-session.json. A green scaffold is not a mainnet readiness statement. Keep feature completeness, evidence, security review and release status separate.


---
