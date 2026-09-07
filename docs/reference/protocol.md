
# Pairband — protocol and technical specification

Version 2.0 · 7 September 2026 · Proposed v1 design, not audited implementation

## 1. Scope and authority

Pairband v1 is a market for **dated, window-exercisable EURC put options, fully backed by USDC**, with Uniswap v4 secondary pools for option tokens. It is a product hypothesis requiring customer, liquidity and security validation. Its initial contract is physically settled: the holder delivers EURC and receives the immutable USDC amount during a specified interval. It is not a perpetual, leveraged product, oracle-cash-settled derivative or payment-flow-pricing platform.

This document is the economic source of truth for the landing/app specifications and O00–O32 build prompts. A proposed implementation that changes its economics must produce a decision record and update all dependent specifications and fixtures before it is accepted. Existing user instructions and repository safety/access rules remain higher priority. Older Pairband documents describing authenticated flow, operator SaaS, spot bands, pooled reserves or an ERC-4626 core vault are historical, not active requirements.

The September 30 target is **deployment readiness**, conditional on dependencies, independent review, legal/product eligibility and operational evidence. A deadline never changes an immutable option's terms or justifies a real-fund release without gates. The working ETHGlobal slice is the same mint/buy/exercise/redeem product on testnet; optional sponsor features are not on the core settlement path.

## 2. Participants and distinct capital accounts

| Participant | Supplies | Receives | Main exposure |
| --- | --- | --- | --- |
| Option buyer | USDC premium; EURC on exercise | Option tokens; USDC on exercise | Premium loss, expiry, availability and issuer risks |
| Option writer | Full USDC exercise backing | Long tokens and writer receipts at mint; premium if sold | EURC received after exercise may lose value |
| AMM LP | Option tokens and/or USDC according to range | Uniswap v4 position NFT and pool fees | Option inventory, adverse selection, expiry, range risk |
| Pairband operator | Development, distribution and operations | Explicit issuance fee if configured; possible future service revenue | Adoption, operating, security and legal obligations |

Backing resides only in a per-series collateral contract. AMM liquidity resides in PoolManager positions. Premium goes to the seller through the pool. Historical seller premium is not a communal writer reserve. Writer receipt transfers move future reserve claims, not past sale proceeds. Protocol fee receipts are separately accounted. Never add protected notional, option market capitalization, collateral and LP liquidity into one financial metric.

## 3. Asset units and exact arithmetic

All supported v1 underlying and settlement tokens must report six decimals and have ordinary exact transfer semantics. Rebasing and fee-on-transfer tokens are excluded. The long option token and writer receipt token each have **six decimals** and are transferable ERC-20s. This permits sufficiently fine trading/fee quantities; zero-decimal option tokens are deliberately not the proposed design.

One displayed whole option equals 1,000,000 raw option units and covers **100 EURC**. Define:

| Symbol / field | Meaning | v1 example |
| --- | --- | --- |
| `q`, `optionUnits` | Integer raw option units, not whole displayed options | 100,000,000 = 100 whole options |
| `A`, `underlyingPerUnit6` | Raw EURC delivered for one raw option unit | 100 |
| `C`, `strikePerUnit6` | Raw USDC paid for one raw option unit | 110 |
| `K` | Displayed strike USDC/EURC | `C / A` = 1.10 |
| `q × A` | Required raw EURC on exercise | 10,000,000,000 = 10,000 EURC |
| `q × C` | Required raw USDC backing / exercise output | 11,000,000,000 = 11,000 USDC |

Every raw option unit has an integer asset obligation. Therefore mint, cancellation and exercise need no fractional collateral rounding. With `A=100`, strike granularity is 0.01 USDC/EURC. The smallest exercise delivers 0.0001 EURC. Do not increase displayed precision beyond contractual granularity or introduce a floating-point strike.

Validate `q > 0`, `A=100`, `C > 0`, supported token addresses/decimals, safe multiplication bounds, and an immutable series `maxWriterUnits`. A technical upper bound of 10^12 raw units limits one series to 1,000,000 whole options / 100,000,000 EURC; pilot caps must be much smaller and chosen from risk/liquidity evidence. The cap is not a target TVL. Enforce bounds before signed v4 amount casts. API/DB raw amounts are integer decimal strings / `numeric(78,0)`. Use bigint in authoritative JavaScript math.

Issuance fee, if enabled: `ceil(q × C × issuanceFeeBps / 10,000)`, paid **in addition to** backing directly to the immutable fee recipient. Demo default is 0 bps. Code hard cap proposed at 50 bps, subject to review; this is an authority limit, not recommended pricing. Use nonzero fixtures to test separation. Cancellation does not refund this fee. No exercise or redemption fee in v1. Pool swap fees are separate and included in executable quote amounts. Never subtract operator revenue from reserved backing.

## 4. Immutable series terms and lifecycle

Series identity contains chainId, factory, underlying, settlement token, `A`, `C`, tradingStart, exerciseStart, exerciseEnd and a factory nonce. Long/receipt addresses belong to exactly one series. Names are descriptive but addresses/series IDs determine identity.

`tradingEnd = exerciseStart`. Require `tradingStart < exerciseStart < exerciseEnd`. All comparisons use chain `block.timestamp`, not the backend clock. Proposed production exercise window: at least 24 hours, validated with users and counsel; testnet may use explicitly short windows. This is a window-exercisable contract, not an exact-instant European settlement.

| Phase | Time interval | Mint | Cancel matched claims | Registered-pool swap/add LP | Exercise | Writer redeem | LP reduce/collect |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Scheduled | `t < tradingStart` | No | No | No | No | No | Yes, if a position exists |
| Trading | `tradingStart <= t < exerciseStart` | Yes | Yes | Yes | No | No | Yes |
| Exercise | `exerciseStart <= t < exerciseEnd` | No | No | No | Yes | No | Yes |
| Matured | `t >= exerciseEnd` | No | No | No | No | Yes | Yes |

ERC-20 transfers remain possible in every phase. Freezing transfers would obstruct LP exits and ordinary claim transfers. The hook gates only pools registered with that hook; third-party markets are outside its coverage. No admin may extend a window after issuance. No keeper call is required for phase transition.

An operator may pause **new risk**: minting, registered-pool swaps and LP additions. This does not block matched cancellation during Trading, exercise during its interval, matured redemption, LP reduction or fee collection. Such pause authority is disclosed; it can disrupt trading availability. There is no generic collateral pause that silently removes existing holders' contractual rights. If a severe vulnerability requires a different emergency mechanism, redesign it explicitly and independently review the rights tradeoff before release.

## 5. Core collateral accounting

Use one nonupgradeable collateral vault and two controller-minted tokens per series. V1 transaction recipients are the calling wallet/account; no arbitrary recipient argument or relayed exercise. The app never holds user signing keys. Wallets may be contract accounts where supported; do not authorize by `tx.origin` or EOA-only assumptions.

### 5.1 Mint

`mint(q)` during Trading and while new risk is enabled:

1. Validate quantity, capacity and supported configuration.
2. Transfer exactly `q × C` USDC from caller into this series vault; verify received amount using the approved Arc-safe balance method.
3. Collect the separate issuance fee into its recipient, atomically; a failed fee transfer reverts the whole mint.
4. Increase accounted USDC and writer units; mint `q` long units and `q` writer receipt units to caller.

Emit `OptionsMinted(seriesId, account, units, collateral6, fee6)`. Minting creates no premium income. Nonreentrant entry points and exact delta verification protect accounting. No lending, delegatecall, arbitrary external executor or collateral rescue function is present.

### 5.2 Matched cancellation

`cancel(q)` only during Trading: caller must own at least `q` long and `q` writer receipt units. Burn both under vault controller authority, reduce writer units/accounted USDC, and transfer `q × C` USDC to caller. Use checks-effects-interactions and revert atomically if transfer fails. Cancellation is allowed despite new-risk pause, but never during Exercise or Matured phases. Fee/premium history is not refunded.

This restriction matters: once some options have exercised, writer receipts claim mixed pooled assets and cannot safely be cancelled for the original fixed USDC amount.

### 5.3 Exercise

`exercise(q)` only in the Exercise interval: validate long balance, compute `q × A` EURC and `q × C` USDC. Pull the exact EURC delivery, burn `q` long units, increase accounted EURC and cumulative exercised units, decrease accounted USDC, pay USDC to caller. All changes are atomic and nonreentrant. Writer receipts are not burned by exercise.

No price feed decides whether exercise is allowed and no oracle calculates output. A holder may exercise even if a displayed reference price suggests this is economically unfavorable. Stablecoin token transfer failures can prevent exercise; the interface must not promise otherwise. At `exerciseEnd` the right expires, even if the user attempted an approval earlier.

### 5.4 Matured writer redemption and rounding

When first finalized onchain after `exerciseEnd`, fix a maturity snapshot using accounted reserves and the writer supply that can no longer be minted/cancelled: `W0`, `U0`, `E0`. Read-only previews may compute prospective snapshot values without writing state. Finalization is permissionless and may be performed inside the first redemption. It does not require a scheduler. If `W0=0`, finalize an empty series without division by zero.

Track cumulative redeemed receipt units `R`, initially zero. For a redemption of `q`, pay USDC `floor((R + q) × U0 / W0) − floor(R × U0 / W0)` and EURC `floor((R + q) × E0 / W0) − floor(R × E0 / W0)`, using full-precision multiplication/division. Burn `q` receipts, advance `R`, reduce remaining accounted reserves and pay both assets atomically. The last redemption brings `R` to `W0`, distributing the complete accounted snapshot without a special dust sweep.

This cumulative allocation distributes rounding as claims arrive. Each payout differs from its exact proportional amount by less than one raw unit of each asset (0.000001 token); it does not accumulate a large residual for the final holder. Order can change an individual preview by at most one raw unit per asset, which the UI discloses. The snapshot denominator remains fixed. Adjacent split claims telescope to the same aggregate payout as one combined claim. Test arbitrary interleavings and conservation; an alternative allocation model requires an ADR.

Writer claims do not expire. Partial redemption is allowed. Once long options expire they do not become writer claims. Remaining long-token supply does not determine writer payouts: some holders may have lost tokens or never exercised. Use accounting counters and the receipt snapshot.

### 5.5 Donations and conservation

Track accounted assets independently from raw vault balances. Unsolicited ERC-20 or native USDC donations do not mint claims and do not change the maturity snapshot. V1 includes no sweep of supported collateral assets, even after ordinary claims clear; unaccounted dust may remain. This intentional limitation avoids an administrator's ambiguous “excess funds” privilege. A later rescue design requires separate review.

Before maturity, with net minted-minus-cancelled units `W` and exercised units `X`:

- `accountedUSDC6 = (W − X) × C`.
- `accountedEURC6 = X × A`.
- `writerReceipt.totalSupply = W`.
- `long.totalSupply = W − X`, assuming no unrelated public burn function.
- Actual asset balances must cover accounted balances; native USDC and ERC-20 USDC are not separate reserve assets.

After maturity/redemptions: original snapshot reserves equal cumulative writer payouts plus remaining accounted reserves. No user action in one series changes another series' counters. Contract USDC must not fund arbitrary gas sponsorship or native sends. Do not deploy self-destruct-capable collateral logic on Arc.

## 6. Uniswap v4 market design

Each listed series has one registered **long option / ERC-20 USDC** PoolKey. The writer receipt is not the traded option. PoolKey includes sorted currencies, fixed LP fee, tick spacing and immutable hook address. Proposed test fixture fee is 3,000 units (0.30% in v4's fee convention); production selection requires liquidity/spread testing. No initial dynamic-fee or custom return-delta mechanism.

`PairbandLifecycleHook` validates the registered PoolKey and series on `beforeInitialize`, blocks unsupported initialization, and checks phase/new-risk pause in `beforeSwap` and `beforeAddLiquidity`. Only the expected PoolManager may invoke callbacks. Hook permissions must match address bits; mine a CREATE2 salt and verify deployed runtime/codehash. No `beforeRemoveLiquidity` restriction, no settlement oracle call, no external HTTP, no collateral movement inside the hook. Option payout rules belong in the vault.

A designated market launcher registers the exact pool and initial sqrt price and initializes/seeds atomically through verified periphery. Avoid a public interval where an arbitrary initial price can be front-run. Match initialization caller/price against immutable registration. Users may add liquidity after launch. Test that a duplicate pool for an unrelated series or mismatched fee/tick configuration is rejected by this hook. Other hooks remain outside Pairband control.

Use a narrow `PairbandRouter` calling verified v4 core for the single registered pool, with direct, bounded ERC-20 approvals. It supports only `buyExactOutput(optionUnits,maxUSDC6,deadline)` and `sellExactInput(optionUnits,minUSDC6,deadline)` plus explicit series selection. Derive payer/recipient from caller and store a validated unlock context; never accept a forged payer from callback bytes. Authenticate PoolManager callbacks, consume the context once, settle all deltas and leave no residual custody. Reject `msg.value`, arbitrary call targets, unsupported pools, invalid signed amount casts and partial fills. Do not invent Universal Router direct-approval support from a generic example.

Quotes use a compatible verified v4 Quoter or simulated narrow-router calls, pinning a block. Buy quantity is exact; sell input must be completely consumed or revert. Encode output/price limits and deadline; simulate the final transaction before requesting signature. A quote is not a price guarantee. Price/order changes require a new review. Pool math converts sorted raw token quantities into `USDC per whole option`; an EURC/USDC spot price is not the option-token price.

LP custody uses a compatible **v4 PositionManager NFT**. Read its actual Permit2/allowance requirements from pinned source, rather than assuming the custom router's approval model applies. Seed maker positions, add/decrease/collect and show inventory separately from vault backing. At cutoff, LP removal must still work. LP-owned options need withdrawal and EURC delivery before they can exercise. No pooled ERC-4626 strategy shares in v1.

**Pricing and liquidity are unresolved commercial work, not solved by the hook.** Option values decay with time and depend on FX movement/volatility, funding, spreads and token risks. A static concentrated-liquidity range can be adversely selected. V1 needs a committed specialist maker, explicit inventory limits, disciplined repricing and measured live quote coverage. A later maker tool may rebalance only its own capital under reviewed permissions. Do not place a public autonomous writer vault on top of an unvalidated pricing model.

Uniswap documents both lifecycle hooks and their limitations; pool attachment does not guarantee routing from the official frontend. Deployment addresses must be verified per chain. [Hooks](https://developers.uniswap.org/docs/protocols/v4/concepts/hooks), [deployments](https://developers.uniswap.org/docs/protocols/v4/deployments)

## 7. Arc integration and dependency evidence

As checked on 7 September 2026, Arc's public connection/address references specify testnet. Configuration here is testnet evidence, not a mainnet address guess:

| Field | Testnet value |
| --- | --- |
| chainId | 5042002 |
| RPC | `https://rpc.testnet.arc.io` |
| Explorer | `https://testnet.arcscan.app` |
| ERC-20 USDC | `0x3600000000000000000000000000000000000000` |
| EURC | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` |

Read chain ID, bytecode and token decimals from the chosen RPC before enabling actions. The Circle skill contains older `.arc.network` RPC examples; prefer the current connection reference and record the discrepancy. Leave all mainnet chain, RPC and contract fields null until official and onchain verification. [Connection reference](https://docs.arc.io/arc/references/connect-to-arc), [contract addresses](https://docs.arc.io/arc/references/contract-addresses)

Arc handling requirements: one USDC balance, token accounting at six decimals, native gas at eighteen; reserve gas before maximum spend; do not wrap USDC into itself. Match transfer emitter/units and avoid dual-log duplication. Current documentation describes a 20 Gwei testnet minimum fee floor; fetch current fees and simulate. Anvil does not reproduce Arc's custom execution rules. Use real Arc RPC integration tests for token transfers, gas accounting, blocklist behavior and sender-preserving extensions. [EVM differences](https://docs.arc.io/arc/references/evm-differences.md), [gas and fees](https://docs.arc.io/arc/references/gas-and-fees.md), [USDC system events](https://docs.arc.io/arc/references/usdc-system-events.md)

The current EVM reference says blocklist-triggered included reverts consume gas; it does not establish the earlier blanket claim that all such reverts lack receipts. Treat missing receipts as an unknown outcome to reconcile, not an assumed standardized failure. Timestamps may repeat between blocks, so index by block/log ordering. Validate any CallFrom/multicall behavior against current Arc source before relying on callback-caller assumptions.

Official Uniswap's deployment page did not list Arc in the checked content. Arc has announced upcoming Uniswap infrastructure, but an announcement is not a verified PoolManager address. A testnet deployment of pinned upstream contracts may be prepared if licensing and actual target support permit; label it **Pairband-deployed testnet instance**, never an official Uniswap deployment. Mainnet release requires verified supported core/periphery or a separately justified and reviewed deployment plan. [Arc's integration overview](https://www.arc.io/blog/how-uniswap-brings-deep-liquidity-for-apps-on-arc)

Optional integration matrix:

| Integration | Role | Gate / fallback |
| --- | --- | --- |
| Circle App Kit Bridge | Bring USDC to Arc | Supported source/destination/token; otherwise funded-wallet instructions |
| Unified Balance | Optional USDC funding UX | Capability/fee/recovery evidence; not counted as vault collateral |
| Circle Wallets | Optional user-controlled onboarding | Recovery, custody model, chain support and terms verified first |
| Circle App Kit Swap | Optional supported spot funding swap | Never assumed to route Pairband options on testnet |
| Uniswap Trading API | Optional future route discovery | Actual chain/pool/token support required; custom core route remains v1 |
| The Graph | Optional live indexed analytics | Provider/network support and real data; no dependency for exercise |
| StableFX | No v1 dependency | Institution access cannot be assumed permissionless |
| Privacy, agents, RWA yield | Roadmap only | Separate threat/economic models and support evidence |

App Kit currently lists only USDC, EURC and cirBTC for Arc testnet swaps. Bridge/unified balance support is not general option-token routing. [App Kit support](https://docs.arc.io/app-kit/references/supported-blockchains)

## 8. Proposed repository and stack

Use a pnpm workspace with TypeScript strict mode. Pin a supported Node LTS, compatible Next.js/React, wagmi/viem, TanStack Query, Tailwind and accessible UI primitives after current documentation checks. Solidity uses pinned Foundry, OpenZeppelin and Uniswap commits with explicit compiler/EVM settings verified on Arc. Do not use moving `latest` or unreviewed install scripts in CI.

| Path | Responsibility |
| --- | --- |
| `apps/web` | Public landing and app routes; wallet-signed transactions |
| `apps/api` | Fastify API, validation, quotes, sessions, early access |
| `apps/worker` | RPC indexing, reconciliation, outbox/reminders |
| `packages/contracts` | Foundry sources, tests, scripts and deployment artifacts |
| `packages/domain` | Integer units, phases, payoff functions, schema validation |
| `packages/sdk` | Generated ABIs, typed read/write builders, manifest checks |
| `packages/ui` | Design tokens and shared accessible components |
| `packages/config` | Typed environment and deployment schemas |
| `packages/database` | PostgreSQL schema/migrations and query layer |
| `infra` | Container/deployment configuration, observability and runbooks |
| `docs` | Decisions, threat model, evidence and product documents |

PostgreSQL is sufficient for v1 persistence, job leases and transactional outbox; Redis is not mandatory. Local development supplies Docker Compose for Postgres and Anvil, deterministic fixtures and seed commands. The public app reads without authentication. Wallet-signed sessions protect private reminder settings, not onchain ownership. Use nonce-based sign-in with domain/URI/chain/expiry binding, EIP-1271 support where applicable, secure cookies, CSRF protection and session invalidation. Avoid introducing Supabase solely as an extra integration.

No central service signs or broadcasts user financial transactions. A deployment signer and optional maker wallet are separate operational roles, never browser credentials. Managed key storage, least privilege and environment separation apply to their later use.

## 9. API, data and workers

The kit's `reference/api-contract.md` defines methods, payloads, status codes and data provenance. All operations that build a transaction return reviewable unsigned calldata; an HTTP request does not mean the transaction happened.

Required endpoints: health/readiness; deployment manifest; series list/detail; live quote; typed action preparation; wallet positions; LP position detail; activity; reference marks; sign-in nonce/verify/logout; reminders; early access. Limit pages and request sizes. Rate-limit public writes and expensive quote calls. Quote caching keys include chain, pool, side, amount and block; never share wallet-specific calldata/allowance decisions across accounts.

Tables: deployments, series, pools, indexed_blocks, indexed_events, series_accounting, token_balances, lp_positions, trade_fills, transaction_intents, quotes, reference_marks, auth_nonces, sessions, notification_preferences, outbox_jobs, early_access_requests. Chain log uniqueness uses chainId + blockHash + txHash + logIndex. Job uniqueness includes purpose/position/window/recipient version. User preferences are access-controlled; public chain data is not treated as secret merely because it sits in a database.

Index protocol events as business facts. USDC transfers support reconciliation but do not create a second synthetic mint/exercise event. Ingest ordered block ranges with checkpoints, retry safely and detect provider inconsistency. Deterministic finality does not excuse silently skipping logs or mishandling chain resets on testnet. Maintain a recovery replay path, transactional writes and a direct RPC check of reserves/phase before critical action preparation.

Workers provide best-effort reminders and metrics. State transitions work without workers. On delivery failures use bounded exponential retry and a dead-letter state. A reminder has no authority over a wallet. Reference marks record source, timestamp, market hours and stale status; no continuously live FX benchmark is assumed over weekends. Educational payoff scenarios remain fixtures, not external price claims.

## 10. Security, operations and tests

Threat model includes vault insolvency, fee/collateral mixing, cross-series claims, receipt-transfer cost-basis errors, callback payer forgery, allowance theft, pool initialization front-running, partial fills, token restrictions, stale quotes, expiry races, LP inventory expiry, source/provider failure, backend/calldata compromise, admin compromise and accidental mainnet configuration.

Contract tests: all timestamp boundaries; partial and full mint/cancel/exercise/redeem; repeated redemptions; shuffled holder order; rounding dust; direct donations/native USDC donations; unsupported tokens; zero amounts/addresses; overflow; reentrancy; full collateral conservation; pool sorting; hook flag validation; unauthorized callbacks; no return-delta surprises; pause permissions; LP removal after cutoff; sell partial fill rejection; nonce/chain/calldata validation. Stateful fuzzing must track independent model reserves, not repeat contract formulas without a separate conservation check.

Integration tests: actual Arc USDC/ERC-20 balance behavior, correct fee units, address bytecode, sender semantics, receipt/balance reconciliation; pinned v4 core/periphery tests; quote-to-execution limits; wallet replacement/rejection; indexer replay and duplicate logs; API authentication and object access; deterministic clock-driven UI; no email without consent. Local fixtures never count as Arc or Graph integration evidence.

Operational targets for a funded pilot: documented RPC failover, quote availability dashboard, indexer lag alert, independent reserve reconciliation, expiry availability monitoring, secrets rotation, database backup/restore drill, immutable deployment manifest, verified contracts and a public recovery guide. Set concrete SLOs from measured infrastructure; tentative targets include API p95 under 500 ms for cached reads, quote p95 under 2 s, and alerting on stale indexing rather than suppressing it. These are engineering targets, not present performance claims.

Deploy frontend/backend with environment isolation and reversible releases. Contract replacement creates a new series/deployment; it does not upgrade existing economic terms. Keep old claim paths documented indefinitely. A UI rollback must remain compatible with outstanding series. Never delete production state or reset a chain to make a demo look clean.

## 11. Commercial and legal readiness

Initial research targets: EURC-holding teams with a known future USDC payment, sophisticated stablecoin option writers, and an options market maker willing to quote a small number of series. The first sale of an option to an independent user is better evidence than subsidized volume between project wallets. Record paid premium, exposure, quoted alternatives, repeat use and willingness to pay. A testnet purchase is usability evidence, not revenue.

Company revenue hypothesis: a disclosed issuance fee and, later, distribution/API services. Model protocol fees, LP fees, maker P&L, writer premiums, gas and subsidies separately. No token launch is required. Do not annualize a short sample or infer venture viability from TVL alone. Arc may value new stablecoin capital-market activity, but support/funding is not established by ecosystem fit. Its Uniswap materials mention structured products broadly; no source reviewed here is a Pairband-specific approval or named FX-options grant. [Arc product context](https://www.arc.io/blog/how-uniswap-brings-deep-liquidity-for-apps-on-arc)

Before real-fund access, obtain jurisdiction-specific advice covering options/derivatives classification, venue and solicitation rules, customer eligibility, operator/admin role, custody/control, stablecoin issuer terms, sanctions obligations, data/privacy and marketing. Produce a facts-and-functions memo rather than assuming a generic crypto policy clears an options venue. Legal documents in the build are drafts until counsel approves. Do not deploy token restrictions that impair existing exercise/redemption rights without an explicit, reviewed legal/technical design.

Go/no-go evidence: independent security review with critical/high issues closed; verified dependencies; tested exercise and redemption under outages; viable maker inventory/spreads; pilot eligibility controls and approved disclosures; no unresolved custody/authority questions. If these are missing on September 30, report **deployment-ready code with named blockers** only when justified, or continue testnet. Do not claim public launch.

## 12. Build schedule, demonstration and future scope

Work estimate assumes two experienced engineers plus fractional design/security/legal help; a solo builder must reduce optional features and move dates. September 7–9: architecture/math, contracts, hook and local integration. September 10–12: deployed testnet slice, core UI/backend, expiry evidence and documentation. Verify the event's exact deadline separately. September 14–20: adversarial testing, maker and customer validation, independent review. September 21–30: close findings, run operational drills and prepare a conditional release. External audit scheduling may make the deadline infeasible; do not invent completion.

Demo one full lifecycle with real testnet transactions: writer backs options; LP supplies separate inventory; buyer purchases exact quantity; quote shows bounds; trading cutoff blocks new swaps; buyer exercises with EURC; writer redeems mixed assets after expiry; LP can still exit. Use legitimately short-dated or pre-created series, never pretend a local time warp occurred on public testnet. Show a hypothetical EURC price decline only in the labeled payoff explainer.

ETHGlobal deliverables include a functioning frontend/backend, architecture diagram, source repository, video/presentation and deployment evidence. Uniswap additionally requires its feedback artifacts. Keep event eligibility and pre-existing work disclosure accurate. [Arc prizes](https://ethglobal.com/events/ethonline2026/prizes/arc), [Uniswap prizes](https://ethglobal.com/events/ethonline2026/prizes/uniswap-foundation)

Future phases, each with a new design/review: EURC-covered calls; new supported currencies; user-controlled exercise automation with explicit permissions and failure handling; professional inventory tooling; covered strategy vaults; distribution SDKs. Do not add cash settlement, leverage, borrowing, perps, RWA reserve lending, privacy or agent trading by extending a few v1 flags. They change the security or economics and require separate specifications.


---
